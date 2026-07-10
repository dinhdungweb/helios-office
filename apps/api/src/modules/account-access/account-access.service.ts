import { Injectable, NotFoundException } from "@nestjs/common";
import {
  accountLicenses,
  accountPermissionCatalog,
  employees,
  permissionGroups,
  userAccounts
} from "../../common/mock-data";

@Injectable()
export class AccountAccessService {
  findSummary() {
    const billableAccounts = userAccounts.filter((account) => account.status !== "closed");

    return {
      totalAccounts: userAccounts.length,
      activeAccounts: userAccounts.filter((account) => account.status === "active").length,
      pendingActivation: userAccounts.filter((account) => account.status === "pending_activation").length,
      closedAccounts: userAccounts.filter((account) => account.status === "closed").length,
      billableLicenses: billableAccounts.length,
      systemAdmins: userAccounts.filter((account) => account.role === "system_admin").length,
      customizedAccounts: userAccounts.filter((account) => account.customPermissionsEnabled).length,
      licenseUsage: accountLicenses.map((license) => ({
        ...license,
        used: billableAccounts.filter((account) => account.licensePlan === license.id).length
      }))
    };
  }

  findAccounts() {
    return userAccounts.map((account) => this.resolveAccount(account));
  }

  findOne(id: string) {
    const account = userAccounts.find((item) => item.id === id);

    if (!account) {
      throw new NotFoundException(`Account ${id} was not found`);
    }

    return this.resolveAccount(account);
  }

  findGroups() {
    return permissionGroups.map((group) => ({
      ...group,
      permissions: accountPermissionCatalog.filter((permission) =>
        group.permissionKeys.includes(permission.key)
      )
    }));
  }

  findLicenses() {
    return accountLicenses;
  }

  findPermissions() {
    return accountPermissionCatalog;
  }

  private resolveAccount(account: (typeof userAccounts)[number]) {
    const group = permissionGroups.find((item) => item.id === account.permissionGroupId) ?? null;
    const license = accountLicenses.find((item) => item.id === account.licensePlan) ?? null;
    const employee = account.employeeId
      ? employees.find((item) => item.id === account.employeeId) ?? null
      : null;
    const effectivePermissionKeys = Array.from(
      new Set([...(group?.permissionKeys ?? []), ...account.customPermissionKeys])
    );

    return {
      ...account,
      employee,
      group,
      license,
      effectivePermissions: accountPermissionCatalog.filter((permission) =>
        effectivePermissionKeys.includes(permission.key)
      )
    };
  }
}
