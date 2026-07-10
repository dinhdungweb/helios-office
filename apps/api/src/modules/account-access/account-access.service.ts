import { Injectable, NotFoundException } from "@nestjs/common";
import { AccountLifecycleStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  accountLicenses,
  accountPermissionCatalog,
} from "../../common/mock-data";
import {
  CreatePermissionGroupDto,
  CreateUserAccountDto,
  UpdatePermissionGroupDto,
  UpdateUserAccountDto
} from "./account-access.dto";

type AccountWithRelations = Prisma.UserAccountGetPayload<{
  include: {
    employee: {
      include: {
        department: true;
      };
    };
    permissionGroup: true;
  };
}>;

@Injectable()
export class AccountAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async findSummary() {
    const accounts = await this.prisma.userAccount.findMany();
    const billableAccounts = accounts.filter((account) => account.accountStatus !== "closed");

    return {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((account) => account.accountStatus === "active").length,
      pendingActivation: accounts.filter((account) => account.accountStatus === "pending_activation").length,
      closedAccounts: accounts.filter((account) => account.accountStatus === "closed").length,
      billableLicenses: billableAccounts.length,
      systemAdmins: accounts.filter((account) => account.adminRole === "system_admin").length,
      customizedAccounts: accounts.filter((account) => account.customPermissionsEnabled).length,
      licenseUsage: accountLicenses.map((license) => ({
        ...license,
        used: billableAccounts.filter((account) => account.licensePlan === license.id).length
      }))
    };
  }

  async findAccounts() {
    const accounts = await this.prisma.userAccount.findMany({
      include: {
        employee: {
          include: {
            department: true
          }
        },
        permissionGroup: true
      },
      orderBy: [{ accountStatus: "asc" }, { displayName: "asc" }]
    });

    return accounts.map((account) => this.resolveAccount(account));
  }

  async findOne(id: string) {
    const account = await this.prisma.userAccount.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true
          }
        },
        permissionGroup: true
      }
    });

    if (!account) {
      throw new NotFoundException(`Account ${id} was not found`);
    }

    return this.resolveAccount(account);
  }

  async findGroups() {
    const groups = await this.prisma.permissionGroup.findMany({
      include: {
        _count: {
          select: {
            accounts: true
          }
        }
      },
      orderBy: { name: "asc" }
    });

    return groups.map((group) => ({
      ...group,
      memberCount: group._count.accounts,
      permissionKeys: group.permissions,
      permissions: accountPermissionCatalog.filter((permission) =>
        group.permissions.includes(permission.key)
      )
    }));
  }

  findLicenses() {
    return accountLicenses;
  }

  findPermissions() {
    return accountPermissionCatalog;
  }

  async createAccount(dto: CreateUserAccountDto) {
    const customPermissionKeys = dto.customPermissionKeys ?? [];
    const created = await this.prisma.$transaction(async (tx) => {
      const account = await tx.userAccount.create({
        data: {
          keycloakUserId: `local-${dto.email}`,
          email: dto.email,
          displayName: dto.displayName,
          roles: [dto.adminRole ?? "user"],
          adminRole: dto.adminRole ?? "user",
          licensePlan: dto.licensePlan ?? "standard",
          accountStatus: dto.accountStatus ?? "pending_activation",
          permissionGroupId: dto.permissionGroupId,
          customPermissionsEnabled: customPermissionKeys.length > 0,
          customPermissions: customPermissionKeys,
          customPermissionNote: dto.customPermissionNote,
          activatedAt: dto.accountStatus === AccountLifecycleStatus.active ? new Date() : null
        }
      });

      if (dto.employeeId) {
        await tx.employee.update({
          where: { id: dto.employeeId },
          data: { userAccountId: account.id }
        });
      }

      await this.writeAudit(tx, "account.create", "UserAccount", account.id, null, account);

      return account;
    });

    return this.findOne(created.id);
  }

  async updateAccount(id: string, dto: UpdateUserAccountDto) {
    const before = await this.prisma.userAccount.findUnique({
      where: { id },
      include: {
        employee: true
      }
    });

    if (!before) {
      throw new NotFoundException(`Account ${id} was not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.UserAccountUncheckedUpdateInput = {};

      if (dto.email !== undefined) {
        data.email = dto.email;
      }

      if (dto.displayName !== undefined) {
        data.displayName = dto.displayName;
      }

      if (dto.adminRole !== undefined) {
        data.adminRole = dto.adminRole;
        data.roles = [dto.adminRole];
      }

      if (dto.licensePlan !== undefined) {
        data.licensePlan = dto.licensePlan;
      }

      if (dto.accountStatus !== undefined) {
        data.accountStatus = dto.accountStatus;
        if (dto.accountStatus === AccountLifecycleStatus.active && !before.activatedAt) {
          data.activatedAt = new Date();
        }
        if (dto.accountStatus === AccountLifecycleStatus.closed && !before.closedAt) {
          data.closedAt = new Date();
        }
      }

      if (dto.permissionGroupId !== undefined) {
        data.permissionGroupId = dto.permissionGroupId;
      }

      if (dto.customPermissionKeys !== undefined) {
        data.customPermissions = dto.customPermissionKeys;
        data.customPermissionsEnabled = dto.customPermissionsEnabled ?? dto.customPermissionKeys.length > 0;
      } else if (dto.customPermissionsEnabled !== undefined) {
        data.customPermissionsEnabled = dto.customPermissionsEnabled;
      }

      if (dto.customPermissionNote !== undefined) {
        data.customPermissionNote = dto.customPermissionNote;
      }

      const account = await tx.userAccount.update({
        where: { id },
        data
      });

      if (dto.employeeId !== undefined) {
        if (before.employee && before.employee.id !== dto.employeeId) {
          await tx.employee.update({
            where: { id: before.employee.id },
            data: { userAccountId: null }
          });
        }

        if (dto.employeeId) {
          await tx.employee.update({
            where: { id: dto.employeeId },
            data: { userAccountId: account.id }
          });
        }
      }

      await this.writeAudit(tx, "account.update", "UserAccount", account.id, before, account);

      return account;
    });

    return this.findOne(updated.id);
  }

  async activateAccount(id: string) {
    return this.updateAccount(id, {
      accountStatus: AccountLifecycleStatus.active
    });
  }

  async closeAccount(id: string) {
    return this.updateAccount(id, {
      accountStatus: AccountLifecycleStatus.closed
    });
  }

  async createGroup(dto: CreatePermissionGroupDto) {
    const group = await this.prisma.permissionGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        roleScope: dto.roleScope ?? "user",
        licensePlan: dto.licensePlan ?? "standard",
        permissions: dto.permissionKeys ?? []
      }
    });

    await this.prisma.auditLog.create({
      data: {
        action: "permission_group.create",
        entityType: "PermissionGroup",
        entityId: group.id,
        afterValue: this.toAuditJson(group)
      }
    });

    return {
      ...group,
      memberCount: 0,
      permissionKeys: group.permissions,
      permissions: accountPermissionCatalog.filter((permission) =>
        group.permissions.includes(permission.key)
      )
    };
  }

  async updateGroup(id: string, dto: UpdatePermissionGroupDto) {
    const before = await this.prisma.permissionGroup.findUnique({
      where: { id }
    });

    if (!before) {
      throw new NotFoundException(`Permission group ${id} was not found`);
    }

    const group = await this.prisma.permissionGroup.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        roleScope: dto.roleScope,
        licensePlan: dto.licensePlan,
        permissions: dto.permissionKeys
      }
    });

    await this.prisma.auditLog.create({
      data: {
        action: "permission_group.update",
        entityType: "PermissionGroup",
        entityId: group.id,
        beforeValue: this.toAuditJson(before),
        afterValue: this.toAuditJson(group)
      }
    });

    return {
      ...group,
      permissionKeys: group.permissions,
      permissions: accountPermissionCatalog.filter((permission) =>
        group.permissions.includes(permission.key)
      )
    };
  }

  private resolveAccount(account: AccountWithRelations) {
    const group = account.permissionGroup;
    const license = accountLicenses.find((item) => item.id === account.licensePlan) ?? null;
    const employee = account.employee;
    const customPermissionKeys = this.resolveCustomPermissionKeys(account.customPermissions);
    const effectivePermissionKeys = Array.from(
      new Set([...(group?.permissions ?? []), ...customPermissionKeys])
    );

    return {
      ...account,
      employeeId: employee?.id ?? null,
      role: account.adminRole,
      status: account.accountStatus,
      groupId: account.permissionGroupId,
      employee: employee
        ? {
            ...employee,
            department: employee.department.name
          }
        : null,
      group,
      license,
      customPermissionKeys,
      effectivePermissions: accountPermissionCatalog.filter((permission) =>
        effectivePermissionKeys.includes(permission.key)
      )
    };
  }

  private resolveCustomPermissionKeys(value: unknown) {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }

    if (
      value &&
      typeof value === "object" &&
      "keys" in value &&
      Array.isArray((value as { keys?: unknown }).keys)
    ) {
      return (value as { keys: unknown[] }).keys.filter((item): item is string => typeof item === "string");
    }

    return [];
  }

  private async writeAudit(
    tx: Prisma.TransactionClient,
    action: string,
    entityType: string,
    entityId: string,
    beforeValue: unknown,
    afterValue: unknown
  ) {
    await tx.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        beforeValue: beforeValue === null ? undefined : this.toAuditJson(beforeValue),
        afterValue: this.toAuditJson(afterValue)
      }
    });
  }

  private toAuditJson(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
