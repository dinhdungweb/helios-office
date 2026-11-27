import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { resolveCustomPermissionKeys, resolveEffectivePermissionKeys } from "../../account-access/account-access.utils";
import type { Delegation, OrgChart } from "./approvers";

type Client = Prisma.TransactionClient;

const WORKING_STATUSES = new Set(["active", "onboarding", "offboarding"]);
export const APPROVAL_ADMIN_PERMISSION = "permission.approvals.manage";

// Loads what approver resolution needs, inside the caller's transaction (≈200 employees, a few
// dozen departments: read whole, as data-scope does).
@Injectable()
export class ApprovalOrgService {
  async orgChart(tx: Client): Promise<OrgChart> {
    const [employees, departments] = await Promise.all([
      tx.employee.findMany({
        select: {
          id: true,
          managerId: true,
          departmentId: true,
          positionId: true,
          jobTitleId: true,
          status: true,
          userAccount: { select: { accountStatus: true } }
        }
      }),
      tx.department.findMany({ select: { id: true, parentId: true, headId: true, permissionStructure: true } })
    ]);

    return {
      employees: new Map(
        employees.map((employee) => [
          employee.id,
          {
            id: employee.id,
            managerId: employee.managerId,
            departmentId: employee.departmentId,
            positionId: employee.positionId,
            jobTitleId: employee.jobTitleId,
            // Someone who cannot sign in cannot approve.
            active: WORKING_STATUSES.has(employee.status) && employee.userAccount?.accountStatus === "active"
          }
        ])
      ),
      departments: new Map(departments.map((department) => [department.id, department]))
    };
  }

  async delegations(tx: Client, onDate: Date): Promise<Delegation[]> {
    const day = new Date(Date.UTC(onDate.getUTCFullYear(), onDate.getUTCMonth(), onDate.getUTCDate()));
    return tx.approvalDelegation.findMany({
      where: { status: "active", fromDate: { lte: day }, toDate: { gte: day } },
      select: { delegatorId: true, delegateId: true, requestTypes: true }
    });
  }

  // Employees whose account may manage approvals: they get requests nobody else can approve (§5.5).
  async fallbackAdminIds(tx: Client): Promise<string[]> {
    const [accounts, catalog] = await Promise.all([
      tx.userAccount.findMany({
        where: { accountStatus: "active", employee: { isNot: null } },
        select: {
          adminRole: true,
          accountStatus: true,
          customPermissionsEnabled: true,
          customPermissions: true,
          customRevokedPermissions: true,
          permissionGroup: { select: { status: true, permissions: true } },
          employee: { select: { id: true } }
        }
      }),
      tx.permissionDefinition.findMany({ select: { key: true } })
    ]);
    const catalogKeys = catalog.map((item) => item.key);

    return accounts
      .filter((account) =>
        resolveEffectivePermissionKeys(
          {
            adminRole: account.adminRole,
            accountStatus: account.accountStatus,
            permissionGroupStatus: account.permissionGroup?.status,
            groupPermissionKeys: account.permissionGroup?.permissions,
            customPermissionKeys: account.customPermissionsEnabled ? resolveCustomPermissionKeys(account.customPermissions) : [],
            revokedPermissionKeys: account.customPermissionsEnabled ? account.customRevokedPermissions : []
          },
          catalogKeys
        ).includes(APPROVAL_ADMIN_PERMISSION)
      )
      .map((account) => account.employee!.id);
  }
}
