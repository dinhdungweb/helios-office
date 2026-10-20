import { NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import type { PrismaService } from "../prisma/prisma.service";
import { DataScopeService, visibleDepartments } from "./data-scope.service";
import type { ScopeLevel } from "./data-scope.types";

// Tree from docs/design/data-scope.md §10.
const departments = [
  { id: "company", parentId: null, permissionStructure: "company" },
  { id: "branch-hn", parentId: "company", permissionStructure: "branch" },
  { id: "sales-hn", parentId: "branch-hn", permissionStructure: "department" },
  { id: "online", parentId: "sales-hn", permissionStructure: "department" },
  { id: "accounting-hn", parentId: "branch-hn", permissionStructure: "department" },
  { id: "branch-hcm", parentId: "company", permissionStructure: "branch" },
  { id: "sales-hcm", parentId: "branch-hcm", permissionStructure: "department" }
];

const employees = [
  { id: "online-staff", departmentId: "online", managerId: "sales-hn-head" },
  { id: "online-colleague", departmentId: "online", managerId: "accounting-lead" },
  { id: "sales-hn-head", departmentId: "sales-hn", managerId: "branch-hn-director" },
  { id: "accounting-lead", departmentId: "accounting-hn", managerId: "branch-hn-director" },
  { id: "accounting-staff", departmentId: "accounting-hn", managerId: "accounting-lead" },
  { id: "branch-hn-director", departmentId: "branch-hn", managerId: null },
  { id: "sales-hcm-staff", departmentId: "sales-hcm", managerId: null }
];

const KEY = "employees.department.manage";
const NON_SCOPABLE_KEY = "system.accounts.manage";

type FakeAccount = {
  employeeId: string | null;
  groupScope?: ScopeLevel | null; // null: granted without explicit scope
  customScope?: ScopeLevel | null;
  groupArchived?: boolean;
  extraGroupKeys?: string[];
};

let accounts: Record<string, FakeAccount> = {};

function matches(employee: (typeof employees)[number], where: Prisma.EmployeeWhereInput): boolean {
  if (where.AND) return ([] as Prisma.EmployeeWhereInput[]).concat(where.AND).every((part) => matches(employee, part));
  if (where.OR) return where.OR.some((part) => matches(employee, part));
  if (typeof where.id === "string") return employee.id === where.id;
  if (where.id && typeof where.id === "object" && "in" in where.id) return (where.id.in as string[]).includes(employee.id);
  if (where.departmentId && typeof where.departmentId === "object" && "in" in where.departmentId) {
    return (where.departmentId.in as string[]).includes(employee.departmentId);
  }
  return Object.keys(where).length === 0;
}

const prisma = {
  department: { findMany: async () => departments },
  employee: {
    findMany: async () => employees,
    findUnique: async ({ where }: { where: { id: string } }) => employees.find((employee) => employee.id === where.id) ?? null,
    count: async ({ where }: { where: Prisma.EmployeeWhereInput }) => employees.filter((employee) => matches(employee, where)).length
  },
  userAccount: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const account = accounts[where.id];
      if (!account) return null;
      const hasGroup = account.groupScope !== undefined;
      const hasCustom = account.customScope !== undefined;
      return {
        customPermissionsEnabled: hasCustom,
        customPermissions: hasCustom ? [KEY] : null,
        customPermissionScopes: account.customScope ? { [KEY]: account.customScope } : null,
        permissionGroup: hasGroup
          ? {
              status: account.groupArchived ? "archived" : "active",
              permissions: [KEY, ...(account.extraGroupKeys ?? [])],
              permissionScopes: account.groupScope ? { [KEY]: account.groupScope } : {}
            }
          : null
      };
    }
  },
  permissionDefinition: {
    findMany: async () => [
      { key: KEY, scopable: true, defaultScope: "department" },
      { key: NON_SCOPABLE_KEY, scopable: false, defaultScope: null }
    ]
  }
} as unknown as PrismaService;

const service = new DataScopeService(prisma);

function user(accountId: string, adminRole: "user" | "system_admin" = "user"): AuthenticatedUser {
  return {
    sub: accountId,
    roles: [],
    claims: {},
    account: {
      id: accountId,
      email: `${accountId}@test`,
      displayName: accountId,
      employeeId: accounts[accountId]?.employeeId ?? null,
      adminRole,
      accountStatus: "active",
      effectivePermissionKeys: [KEY]
    }
  };
}

async function visibleEmployees(accountId: string, adminRole: "user" | "system_admin" = "user") {
  const scope = await service.resolve(user(accountId, adminRole), [KEY]);
  const where = service.employeeWhere(scope);
  return employees.filter((employee) => matches(employee, where)).map((employee) => employee.id).sort();
}

beforeEach(() => {
  accounts = {};
});

describe("DataScopeService.resolve (design table §10)", () => {
  it("self: only the account's own employee", async () => {
    accounts.a = { employeeId: "online-staff", groupScope: "self" };
    expect(await visibleEmployees("a")).toEqual(["online-staff"]);
  });

  it("department: own department only, not child departments", async () => {
    accounts.a = { employeeId: "sales-hn-head", groupScope: "department" };
    // online-staff reports to sales-hn-head, so it is visible through the reporting line, but its
    // colleague in the child department is not.
    expect(await visibleEmployees("a")).toEqual(["online-staff", "sales-hn-head"]);
  });

  it("department_tree: own department and descendants", async () => {
    accounts.a = { employeeId: "sales-hn-head", groupScope: "department_tree" };
    expect(await visibleEmployees("a")).toEqual(["online-colleague", "online-staff", "sales-hn-head"]);
  });

  it("branch: whole branch up to the nearest boundary, not the other branch", async () => {
    accounts.a = { employeeId: "online-staff", groupScope: "branch" };
    const visible = await visibleEmployees("a");
    expect(visible).toEqual(["accounting-lead", "accounting-staff", "branch-hn-director", "online-colleague", "online-staff", "sales-hn-head"]);
    expect(visible).not.toContain("sales-hcm-staff");
  });

  it("direct reports are visible across departments (decision 1)", async () => {
    accounts.a = { employeeId: "accounting-lead", groupScope: "department" };
    expect(await visibleEmployees("a")).toEqual(["accounting-lead", "accounting-staff", "online-colleague"]);
  });

  it("indirect reports are included", async () => {
    accounts.a = { employeeId: "branch-hn-director", groupScope: "self" };
    expect(await visibleEmployees("a")).toEqual(
      ["accounting-lead", "accounting-staff", "branch-hn-director", "online-colleague", "online-staff", "sales-hn-head"]
    );
  });

  it("account without an employee profile sees nobody unless company-wide", async () => {
    accounts.a = { employeeId: null, groupScope: "department" };
    expect(await visibleEmployees("a")).toEqual([]);
  });

  it("widest grant wins across group and custom permissions", async () => {
    accounts.a = { employeeId: "online-staff", groupScope: "department", customScope: "company" };
    expect(await visibleEmployees("a")).toHaveLength(employees.length);
  });

  it("missing explicit scope falls back to the definition default", async () => {
    accounts.a = { employeeId: "accounting-staff", groupScope: null };
    expect(await visibleEmployees("a")).toEqual(["accounting-lead", "accounting-staff"]);
  });

  it("archived group grants nothing", async () => {
    accounts.a = { employeeId: "online-staff", groupScope: "company", groupArchived: true };
    expect((await service.resolve(user("a"), [KEY])).level).toBe("self");
  });

  it("system_admin is always company-wide", async () => {
    accounts.a = { employeeId: "online-staff", groupScope: "self" };
    expect(await visibleEmployees("a", "system_admin")).toHaveLength(employees.length);
  });

  it("a held non-scopable permission is company-wide", async () => {
    accounts.a = { employeeId: "online-staff", groupScope: "self", extraGroupKeys: [NON_SCOPABLE_KEY] };
    expect((await service.resolve(user("a"), [KEY, NON_SCOPABLE_KEY])).level).toBe("company");
  });

  it("permissions the account does not hold do not widen the scope", async () => {
    accounts.a = { employeeId: "online-staff", groupScope: "self" };
    expect((await service.resolve(user("a"), [KEY, NON_SCOPABLE_KEY])).level).toBe("self");
  });
});

describe("DataScopeService.assertEmployeeInScope", () => {
  it("throws NotFound outside the scope (decision 3) and passes inside", async () => {
    accounts.a = { employeeId: "accounting-staff", groupScope: "department" };
    const scope = await service.resolve(user("a"), [KEY]);
    await expect(service.assertEmployeeInScope(scope, "accounting-lead")).resolves.toBeUndefined();
    await expect(service.assertEmployeeInScope(scope, "sales-hcm-staff")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("visibleDepartments", () => {
  it("survives a cycle in department data", () => {
    const cyclic = [
      { id: "x", parentId: "y", permissionStructure: "department" },
      { id: "y", parentId: "x", permissionStructure: "department" }
    ];
    expect(visibleDepartments("department_tree", "x", cyclic).sort()).toEqual(["x", "y"]);
    expect(visibleDepartments("branch", "x", cyclic).length).toBeGreaterThan(0);
  });
});
