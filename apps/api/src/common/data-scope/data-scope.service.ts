import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import { resolveCustomPermissionKeys } from "../../modules/account-access/account-access.utils";
import { PrismaService } from "../prisma/prisma.service";
import {
  COMPANY_SCOPE,
  isScopeLevel,
  parseScopeMap,
  type ResolvedScope,
  type ScopeLevel,
  widerScope
} from "./data-scope.types";

type DepartmentNode = { id: string; parentId: string | null; permissionStructure: string };
type EmployeeNode = { id: string; managerId: string | null };

const BRANCH_BOUNDARIES = new Set(["branch", "company"]);

// Answers "which records may this account see for these permissions" (docs/design/data-scope.md).
// The department tree and reporting lines are read per call: ~200 employees and a few dozen
// departments make that cheap, and it means a transfer is reflected on the very next request.
@Injectable()
export class DataScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(user: AuthenticatedUser | undefined, permissionKeys: readonly string[]): Promise<ResolvedScope> {
    const account = user?.account;

    if (!account) {
      return { level: "self", departmentIds: [], employeeIds: [] };
    }

    if (account.adminRole === "system_admin") {
      return COMPANY_SCOPE;
    }

    const level = await this.resolveLevel(account.id, permissionKeys);

    if (level === "company") {
      return COMPANY_SCOPE;
    }

    const [departments, employees, self] = await Promise.all([
      this.prisma.department.findMany({ select: { id: true, parentId: true, permissionStructure: true } }),
      this.prisma.employee.findMany({ select: { id: true, managerId: true } }),
      account.employeeId
        ? this.prisma.employee.findUnique({ where: { id: account.employeeId }, select: { id: true, departmentId: true } })
        : null
    ]);

    if (!self) {
      return { level, departmentIds: [], employeeIds: [] };
    }

    return {
      level,
      departmentIds: visibleDepartments(level, self.departmentId, departments),
      employeeIds: [self.id, ...subordinatesOf(self.id, employees)]
    };
  }

  // Widest scope among the requested permissions the account actually holds.
  async resolveLevel(accountId: string, permissionKeys: readonly string[]): Promise<ScopeLevel> {
    const [account, definitions] = await Promise.all([
      this.prisma.userAccount.findUnique({
        where: { id: accountId },
        select: {
          customPermissionsEnabled: true,
          customPermissions: true,
          customPermissionScopes: true,
          permissionGroup: { select: { status: true, permissions: true, permissionScopes: true } }
        }
      }),
      this.prisma.permissionDefinition.findMany({
        where: { key: { in: [...permissionKeys] } },
        select: { key: true, scopable: true, defaultScope: true }
      })
    ]);

    const definitionByKey = new Map(definitions.map((definition) => [definition.key, definition]));
    const group = account?.permissionGroup && account.permissionGroup.status !== "archived" ? account.permissionGroup : null;
    const groupScopes = parseScopeMap(group?.permissionScopes);
    const customKeys = account?.customPermissionsEnabled ? resolveCustomPermissionKeys(account.customPermissions) : [];
    const customScopes = parseScopeMap(account?.customPermissionScopes);
    let widest: ScopeLevel | null = null;

    for (const key of permissionKeys) {
      const definition = definitionByKey.get(key);
      const grants: Array<ScopeLevel | undefined> = [];

      if (group?.permissions.includes(key)) grants.push(groupScopes[key]);
      if (customKeys.includes(key)) grants.push(customScopes[key]);

      for (const explicit of grants) {
        const grantLevel: ScopeLevel = !definition?.scopable
          ? "company"
          : explicit ?? (isScopeLevel(definition.defaultScope) ? definition.defaultScope : "company");
        widest = widest ? widerScope(widest, grantLevel) : grantLevel;
      }
    }

    // PermissionGuard has already ensured at least one grant; fall back to the narrowest scope.
    return widest ?? "self";
  }

  employeeWhere(scope: ResolvedScope): Prisma.EmployeeWhereInput {
    if (scope.level === "company") {
      return {};
    }

    const conditions: Prisma.EmployeeWhereInput[] = [];
    if (scope.departmentIds.length > 0) conditions.push({ departmentId: { in: scope.departmentIds } });
    if (scope.employeeIds.length > 0) conditions.push({ id: { in: scope.employeeIds } });

    return conditions.length > 0 ? { OR: conditions } : { id: { in: [] } };
  }

  // For models related to Employee (AttendanceRecord, LeaveRequest, Contract, PayrollItem...).
  viaEmployee(scope: ResolvedScope): { employee?: Prisma.EmployeeWhereInput } {
    return scope.level === "company" ? {} : { employee: this.employeeWhere(scope) };
  }

  departmentInScope(scope: ResolvedScope, departmentId: string) {
    return scope.level === "company" || scope.departmentIds.includes(departmentId);
  }

  // Records outside the scope are reported as missing so their existence is not revealed (decision 3).
  async assertEmployeeInScope(scope: ResolvedScope, employeeId: string) {
    if (scope.level === "company") {
      return;
    }

    const visible = await this.prisma.employee.count({
      where: { AND: [{ id: employeeId }, this.employeeWhere(scope)] }
    });

    if (visible === 0) {
      throw new NotFoundException(`Employee ${employeeId} was not found`);
    }
  }
}

export function visibleDepartments(level: ScopeLevel, ownDepartmentId: string, departments: DepartmentNode[]): string[] {
  switch (level) {
    case "self":
      return [];
    case "department":
      return [ownDepartmentId];
    case "department_tree":
      return descendantsOf(ownDepartmentId, departments);
    case "branch":
      return descendantsOf(branchRootOf(ownDepartmentId, departments), departments);
    case "company":
      return departments.map((department) => department.id);
  }
}

// Nearest ancestor (or the department itself) marked as a branch/company boundary; the top of the
// tree when nothing is marked.
function branchRootOf(departmentId: string, departments: DepartmentNode[]) {
  const byId = new Map(departments.map((department) => [department.id, department]));
  const visited = new Set<string>();
  let current = byId.get(departmentId);
  let top = departmentId;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (BRANCH_BOUNDARIES.has(current.permissionStructure)) return current.id;
    top = current.id;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return top;
}

function descendantsOf(rootId: string, departments: DepartmentNode[]) {
  return walkTree(rootId, departments.map((department) => ({ id: department.id, parentId: department.parentId })));
}

function subordinatesOf(employeeId: string, employees: EmployeeNode[]) {
  return walkTree(employeeId, employees.map((employee) => ({ id: employee.id, parentId: employee.managerId }))).filter(
    (id) => id !== employeeId
  );
}

// Breadth-first walk from rootId down parent links; the visited set guards against cycles in bad data.
function walkTree(rootId: string, nodes: Array<{ id: string; parentId: string | null }>) {
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    children.set(node.parentId, [...(children.get(node.parentId) ?? []), node.id]);
  }

  const visited = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    for (const child of children.get(queue.shift()!) ?? []) {
      if (!visited.has(child)) {
        visited.add(child);
        queue.push(child);
      }
    }
  }

  return [...visited];
}
