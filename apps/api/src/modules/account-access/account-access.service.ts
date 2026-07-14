import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountLifecycleStatus, PermissionGroupStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AdminSettingsService } from "../admin-settings/admin-settings.service";
import { KeycloakAdminService } from "../auth/keycloak-admin.service";
import { accountPermissionCatalog } from "../../common/mock-data";
import {
  CreatePermissionDefinitionDto,
  CreatePermissionGroupDto,
  CreateUserAccountDto,
  UpdatePermissionDefinitionDto,
  UpdatePermissionGroupDto,
  UpdateUserAccountDto
} from "./account-access.dto";
import {
  buildPermissionGroupIdBase,
  buildPermissionGroupIdCandidate,
  resolveCustomPermissionKeys,
  resolveEffectivePermissionKeys
} from "./account-access.utils";

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

type PermissionGroupRecord = Prisma.PermissionGroupGetPayload<{}> & {
  _count?: {
    accounts: number;
  };
};

type PermissionCatalogItem = {
  key: string;
  category: string;
  label: string;
  description: string | null;
  adminOnly: boolean;
  sortOrder: number;
};

const internalPermissionGroupIds = new Set(["grp-system-admin"]);

const protectedPermissionGroupIds = new Set(["grp-directors", "grp-employees", "grp-managers"]);

@Injectable()
export class AccountAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
    private readonly config: ConfigService,
    private readonly adminSettings: AdminSettingsService
  ) {}

  async findSummary() {
    const accounts = await this.prisma.userAccount.findMany();

    return {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((account) => account.accountStatus === "active").length,
      pendingActivation: accounts.filter((account) => account.accountStatus === "pending_activation").length,
      closedAccounts: accounts.filter((account) => account.accountStatus === "closed").length,
      systemAdmins: accounts.filter((account) => account.adminRole === "system_admin").length,
      customizedAccounts: accounts.filter((account) => account.customPermissionsEnabled).length
    };
  }

  async findAccounts() {
    const [accounts, permissionCatalog] = await Promise.all([
      this.prisma.userAccount.findMany({
        include: {
          employee: {
            include: {
              department: true
            }
          },
          permissionGroup: true
        },
        orderBy: [{ accountStatus: "asc" }, { displayName: "asc" }]
      }),
      this.findPermissionCatalog()
    ]);

    return accounts.map((account) => this.resolveAccount(account, permissionCatalog));
  }

  async findOne(id: string) {
    const [account, permissionCatalog] = await Promise.all([
      this.prisma.userAccount.findUnique({
        where: { id },
        include: {
          employee: {
            include: {
              department: true
            }
          },
          permissionGroup: true
        },
      }),
      this.findPermissionCatalog()
    ]);

    if (!account) {
      throw new NotFoundException(`Account ${id} was not found`);
    }

    return this.resolveAccount(account, permissionCatalog);
  }

  async findGroups() {
    const [groups, permissionCatalog] = await Promise.all([
      this.prisma.permissionGroup.findMany({
        include: {
          _count: {
            select: {
              accounts: true
            }
          }
        },
        orderBy: [{ status: "asc" }, { name: "asc" }]
      }),
      this.findPermissionCatalog()
    ]);

    return groups
      .filter((group) => !internalPermissionGroupIds.has(group.id))
      .map((group) => this.resolvePermissionGroup(group, permissionCatalog));
  }

  async findPermissions() {
    return this.findPermissionCatalog();
  }

  async createPermissionDefinition(dto: CreatePermissionDefinitionDto, actorId?: string) {
    try {
      const permission = await this.prisma.permissionDefinition.create({
        data: {
          key: dto.key,
          category: dto.category,
          label: dto.label,
          description: dto.description,
          adminOnly: dto.adminOnly ?? false,
          sortOrder: dto.sortOrder ?? 0
        }
      });

      await this.writeCatalogAudit("permission_definition.create", permission.key, null, permission, actorId);

      return this.resolvePermissionDefinition(permission);
    } catch (error) {
      if (this.isUniqueConstraintOn(error, "key")) {
        throw new ConflictException(`Permission ${dto.key} already exists`);
      }

      throw error;
    }
  }

  async updatePermissionDefinition(key: string, dto: UpdatePermissionDefinitionDto, actorId?: string) {
    const before = await this.prisma.permissionDefinition.findUnique({
      where: { key }
    });

    if (!before) {
      throw new NotFoundException(`Permission ${key} was not found`);
    }

    const permission = await this.prisma.permissionDefinition.update({
      where: { key },
      data: {
        category: dto.category,
        label: dto.label,
        description: dto.description,
        adminOnly: dto.adminOnly,
        sortOrder: dto.sortOrder
      }
    });

    await this.writeCatalogAudit("permission_definition.update", permission.key, before, permission, actorId);

    return this.resolvePermissionDefinition(permission);
  }

  async deletePermissionDefinition(key: string, actorId?: string) {
    const before = await this.prisma.permissionDefinition.findUnique({
      where: { key }
    });

    if (!before) {
      throw new NotFoundException(`Permission ${key} was not found`);
    }

    const [groupsUsingPermission, customAccounts] = await Promise.all([
      this.prisma.permissionGroup.count({
        where: {
          permissions: {
            has: key
          }
        }
      }),
      this.prisma.userAccount.findMany({
        where: {
          customPermissionsEnabled: true
        },
        select: {
          id: true,
          customPermissions: true
        }
      })
    ]);
    const customAccountsUsingPermission = customAccounts.filter((account) =>
      resolveCustomPermissionKeys(account.customPermissions).includes(key)
    ).length;

    if (groupsUsingPermission > 0 || customAccountsUsingPermission > 0) {
      throw new ConflictException(
        `Permission ${key} is in use by ${groupsUsingPermission} group(s) and ${customAccountsUsingPermission} custom account override(s)`
      );
    }

    await this.prisma.permissionDefinition.delete({
      where: { key }
    });

    await this.writeCatalogAudit("permission_definition.delete", key, before, null, actorId);

    return { ok: true };
  }

  async createAccount(dto: CreateUserAccountDto, actorId?: string) {
    const adminRole = dto.adminRole ?? "user";
    const isSystemAdmin = adminRole === "system_admin";
    const customPermissionKeys = isSystemAdmin ? [] : dto.customPermissionKeys ?? [];
    const permissionGroupId = isSystemAdmin ? null : dto.permissionGroupId;
    const accountStatus = dto.accountStatus ?? AccountLifecycleStatus.pending_activation;
    const requirePasswordChange = dto.requirePasswordChange ?? true;
    const sendInviteEmail = dto.sendInviteEmail ?? false;
    const temporaryPasswordIssuedAt = dto.initialPassword ? new Date() : null;
    if (isSystemAdmin) {
      await this.assertSingleSystemAdmin();
    }
    await this.assertAssignablePermissionGroup(permissionGroupId);
    await this.assertKnownPermissionKeys(customPermissionKeys);

    const existingAccount = await this.prisma.userAccount.findUnique({
      where: { email: dto.email }
    });

    if (existingAccount) {
      throw new ConflictException("Account email already exists");
    }

    const provisionedUser = await this.keycloakAdmin.provisionUser({
      email: dto.email,
      displayName: dto.displayName,
      enabled: this.isKeycloakUserEnabled(accountStatus),
      initialPassword: dto.initialPassword,
      temporaryPassword: Boolean(dto.initialPassword && requirePasswordChange),
      requiredActions: requirePasswordChange ? ["UPDATE_PASSWORD"] : [],
      roles: [adminRole],
      username: dto.username ?? dto.email
    });
    const created = await this.prisma.$transaction(async (tx) => {
      const account = await tx.userAccount.create({
        data: {
          keycloakUserId: provisionedUser.id,
          email: dto.email,
          displayName: dto.displayName,
          roles: [adminRole],
          adminRole,
          accountStatus,
          permissionGroupId,
          customPermissionsEnabled: customPermissionKeys.length > 0,
          customPermissions: customPermissionKeys,
          customPermissionNote: isSystemAdmin ? null : dto.customPermissionNote,
          passwordResetRequired: requirePasswordChange,
          temporaryPasswordIssuedAt,
          inviteEmailRequested: sendInviteEmail,
          activatedAt: accountStatus === AccountLifecycleStatus.active ? new Date() : null
        }
      });

      if (!isSystemAdmin && dto.employeeId) {
        await tx.employee.update({
          where: { id: dto.employeeId },
          data: { userAccountId: account.id }
        });
      }

      await this.writeAudit(tx, "account.create", "UserAccount", account.id, null, account, actorId);

      return account;
    });

    await this.deliverInviteIfReady(created.id, actorId);

    return this.findOne(created.id);
  }

  async updateAccount(id: string, dto: UpdateUserAccountDto, actorId?: string) {
    const before = await this.prisma.userAccount.findUnique({
      where: { id },
      include: {
        employee: true
      }
    });

    if (!before) {
      throw new NotFoundException(`Account ${id} was not found`);
    }

    const nextAdminRole = dto.adminRole ?? before.adminRole;
    const isSystemAdmin = nextAdminRole === "system_admin";
    const nextPermissionGroupId = isSystemAdmin ? null : dto.permissionGroupId;

    if (isSystemAdmin) {
      await this.assertSingleSystemAdmin(id);
    }

    await this.assertAssignablePermissionGroup(nextPermissionGroupId);

    if (!isSystemAdmin && dto.customPermissionKeys !== undefined) {
      await this.assertKnownPermissionKeys(dto.customPermissionKeys);
    }

    const keycloakSync = await this.syncKeycloakBeforeUpdate(before, dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.UserAccountUncheckedUpdateInput = {};

      if (keycloakSync?.userId) {
        data.keycloakUserId = keycloakSync.userId;
      }

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

      if (isSystemAdmin) {
        data.permissionGroupId = null;
        data.customPermissions = [];
        data.customPermissionsEnabled = false;
        data.customPermissionNote = null;
      }

      if (!isSystemAdmin && dto.customPermissionKeys !== undefined) {
        data.customPermissions = dto.customPermissionKeys;
        data.customPermissionsEnabled = dto.customPermissionsEnabled ?? dto.customPermissionKeys.length > 0;
      } else if (!isSystemAdmin && dto.customPermissionsEnabled !== undefined) {
        data.customPermissionsEnabled = dto.customPermissionsEnabled;
      }

      if (!isSystemAdmin && dto.customPermissionNote !== undefined) {
        data.customPermissionNote = dto.customPermissionNote;
      }

      const account = await tx.userAccount.update({
        where: { id },
        data
      });

      if (isSystemAdmin) {
        if (before.employee) {
          await tx.employee.update({
            where: { id: before.employee.id },
            data: { userAccountId: null }
          });
        }
      } else if (dto.employeeId !== undefined) {
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

      await this.writeAudit(tx, "account.update", "UserAccount", account.id, before, account, actorId);

      return account;
    });

    return this.findOne(updated.id);
  }

  async activateAccount(id: string, actorId?: string) {
    await this.updateAccount(id, {
      accountStatus: AccountLifecycleStatus.active
    }, actorId);

    await this.deliverInviteIfReady(id, actorId);

    return this.findOne(id);
  }

  async closeAccount(id: string, actorId?: string) {
    return this.updateAccount(id, {
      accountStatus: AccountLifecycleStatus.closed
    }, actorId);
  }

  async resendInvite(id: string, actorId?: string) {
    const account = await this.prisma.userAccount.findUnique({
      where: { id }
    });

    if (!account) {
      throw new NotFoundException(`Account ${id} was not found`);
    }

    if (account.accountStatus !== AccountLifecycleStatus.active) {
      throw new ConflictException("Activate the account before sending an invite email");
    }

    if (!(await this.isInviteEmailEnabled())) {
      throw new ConflictException("SMTP invite email is not enabled or is missing required configuration");
    }

    try {
      let keycloakUserId = account.keycloakUserId;

      if (account.keycloakUserId.startsWith("local-")) {
        const provisioned = await this.keycloakAdmin.provisionUser({
          email: account.email,
          displayName: account.displayName,
          enabled: true,
          requiredActions: ["UPDATE_PASSWORD"],
          roles: [account.adminRole],
          username: account.email
        });

        keycloakUserId = provisioned.id;
      } else {
        await this.keycloakAdmin.updateUser(account.keycloakUserId, {
          enabled: true,
          requiredActions: ["UPDATE_PASSWORD"],
          roles: [account.adminRole]
        });
      }

      await this.keycloakAdmin.sendRequiredActionsEmail(keycloakUserId, ["UPDATE_PASSWORD"]);

      const updated = await this.prisma.userAccount.update({
        where: { id: account.id },
        data: {
          keycloakUserId,
          passwordResetRequired: true,
          inviteEmailRequested: true,
          inviteSentAt: new Date()
        }
      });

      await this.writeSystemAudit("account.invite.resent", "UserAccount", account.id, account, updated, actorId);

      return this.findOne(account.id);
    } catch (error) {
      await this.writeSystemAudit("account.invite.failed", "UserAccount", account.id, null, {
        email: account.email,
        reason: error instanceof Error ? error.message.slice(0, 300) : "unknown_error"
      }, actorId);

      throw error;
    }
  }

  async createGroup(dto: CreatePermissionGroupDto, actorId?: string) {
    const baseId = buildPermissionGroupIdBase(dto.name);
    const permissionKeys = await this.assertKnownPermissionKeys(this.resolvePermissionGroupKeys(dto.permissionKeys ?? []));

    for (let attempt = 1; attempt <= 20; attempt += 1) {
      const id = buildPermissionGroupIdCandidate(baseId, attempt);

      try {
        const group = await this.prisma.permissionGroup.create({
          data: {
            id,
            name: dto.name,
            description: dto.description,
            roleScope: "user",
            permissions: permissionKeys,
            status: PermissionGroupStatus.active
          }
        });

        await this.prisma.auditLog.create({
          data: {
            actorId,
            action: "permission_group.create",
            entityType: "PermissionGroup",
            entityId: group.id,
            afterValue: this.toAuditJson(group)
          }
        });

        return this.resolvePermissionGroup({ ...group, _count: { accounts: 0 } }, await this.findPermissionCatalog());
      } catch (error) {
        if (this.isUniqueConstraintOn(error, "id")) {
          continue;
        }

        if (this.isUniqueConstraintOn(error, "name")) {
          throw new ConflictException(`Permission group "${dto.name}" already exists`);
        }

        throw error;
      }
    }

    throw new ConflictException(`Could not create a unique permission group id for "${dto.name}"`);
  }

  async updateGroup(id: string, dto: UpdatePermissionGroupDto, actorId?: string) {
    const before = await this.prisma.permissionGroup.findUnique({
      where: { id }
    });

    if (!before) {
      throw new NotFoundException(`Permission group ${id} was not found`);
    }

    if (before.status === PermissionGroupStatus.archived) {
      throw new ConflictException("Archived permission groups cannot be updated");
    }

    const rawPermissionKeys = dto.permissionKeys;
    const permissionKeys = rawPermissionKeys !== undefined
      ? await this.assertKnownPermissionKeys(this.resolvePermissionGroupKeys(rawPermissionKeys))
      : undefined;

    const group = await this.prisma.permissionGroup.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        roleScope: "user",
        permissions: permissionKeys
      },
      include: {
        _count: {
          select: {
            accounts: true
          }
        }
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "permission_group.update",
        entityType: "PermissionGroup",
        entityId: group.id,
        beforeValue: this.toAuditJson(before),
        afterValue: this.toAuditJson(group)
      }
    });

    return this.resolvePermissionGroup(group, await this.findPermissionCatalog());
  }

  async archiveGroup(id: string, actorId?: string) {
    const before = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            accounts: true
          }
        }
      }
    });

    if (!before) {
      throw new NotFoundException(`Permission group ${id} was not found`);
    }

    if (protectedPermissionGroupIds.has(before.id)) {
      throw new ConflictException("Default permission groups cannot be archived");
    }

    if (before.status === PermissionGroupStatus.archived) {
      return this.resolvePermissionGroup(before, await this.findPermissionCatalog());
    }

    if (before._count.accounts > 0) {
      throw new ConflictException("Move all accounts out of this permission group before archiving it");
    }

    const group = await this.prisma.permissionGroup.update({
      where: { id },
      data: {
        status: PermissionGroupStatus.archived,
        archivedAt: new Date()
      },
      include: {
        _count: {
          select: {
            accounts: true
          }
        }
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "permission_group.archive",
        entityType: "PermissionGroup",
        entityId: group.id,
        beforeValue: this.toAuditJson(before),
        afterValue: this.toAuditJson(group)
      }
    });

    return this.resolvePermissionGroup(group, await this.findPermissionCatalog());
  }

  async restoreGroup(id: string, actorId?: string) {
    const before = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            accounts: true
          }
        }
      }
    });

    if (!before) {
      throw new NotFoundException(`Permission group ${id} was not found`);
    }

    if (before.status === PermissionGroupStatus.active) {
      return this.resolvePermissionGroup(before, await this.findPermissionCatalog());
    }

    const group = await this.prisma.permissionGroup.update({
      where: { id },
      data: {
        status: PermissionGroupStatus.active,
        archivedAt: null
      },
      include: {
        _count: {
          select: {
            accounts: true
          }
        }
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "permission_group.restore",
        entityType: "PermissionGroup",
        entityId: group.id,
        beforeValue: this.toAuditJson(before),
        afterValue: this.toAuditJson(group)
      }
    });

    return this.resolvePermissionGroup(group, await this.findPermissionCatalog());
  }

  private resolveAccount(account: AccountWithRelations, permissionCatalog: PermissionCatalogItem[]) {
    const isSystemAdmin = account.adminRole === "system_admin";
    const group = isSystemAdmin ? null : account.permissionGroup;
    const employee = isSystemAdmin ? null : account.employee;
    const customPermissionKeys = !isSystemAdmin && account.customPermissionsEnabled
      ? resolveCustomPermissionKeys(account.customPermissions)
      : [];
    const effectivePermissionKeys = resolveEffectivePermissionKeys(
      {
        adminRole: account.adminRole,
        accountStatus: account.accountStatus,
        permissionGroupStatus: group?.status,
        groupPermissionKeys: group?.permissions,
        customPermissionKeys
      },
      permissionCatalog.map((permission) => permission.key)
    );
    const { licensePlan: _licensePlan, permissionGroup: _permissionGroup, customPermissions: _customPermissions, ...accountData } = account;

    return {
      ...accountData,
      displayName: isSystemAdmin ? "Admin" : account.displayName,
      employeeId: employee?.id ?? null,
      role: account.adminRole,
      status: account.accountStatus,
      groupId: isSystemAdmin ? null : account.permissionGroupId,
      permissionGroupId: isSystemAdmin ? null : account.permissionGroupId,
      customPermissionsEnabled: isSystemAdmin ? false : account.customPermissionsEnabled,
      customPermissionNote: isSystemAdmin ? null : account.customPermissionNote,
      employee: employee
        ? {
            ...employee,
            department: employee.department.name
          }
        : null,
      group: group ? this.resolvePermissionGroup(group, permissionCatalog) : null,
      customPermissionKeys,
      effectivePermissionKeys,
      effectivePermissions: permissionCatalog.filter((permission) =>
        effectivePermissionKeys.includes(permission.key)
      )
    };
  }

  private resolvePermissionGroup(group: PermissionGroupRecord, permissionCatalog: PermissionCatalogItem[]) {
    const { _count, licensePlan: _licensePlan, ...permissionGroup } = group;

    return {
      ...permissionGroup,
      memberCount: _count?.accounts ?? 0,
      permissionKeys: group.permissions,
      permissions: permissionCatalog.filter((permission) =>
        group.permissions.includes(permission.key)
      )
    };
  }

  private async findPermissionCatalog(): Promise<PermissionCatalogItem[]> {
    const permissions = await this.prisma.permissionDefinition.findMany({
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { key: "asc" }]
    });
    const defaultPermissions = accountPermissionCatalog.map((permission, index) => ({
      ...permission,
      description: null,
      sortOrder: index + 1
    }));

    if (permissions.length === 0) {
      return defaultPermissions;
    }

    const permissionByKey = new Map<string, PermissionCatalogItem>();

    for (const permission of defaultPermissions) {
      permissionByKey.set(permission.key, permission);
    }

    for (const permission of permissions) {
      permissionByKey.set(permission.key, this.resolvePermissionDefinition(permission));
    }

    return Array.from(permissionByKey.values()).sort(
      (first, second) =>
        first.sortOrder - second.sortOrder ||
        first.category.localeCompare(second.category, "vi") ||
        first.key.localeCompare(second.key)
    );
  }

  private resolvePermissionDefinition(permission: Prisma.PermissionDefinitionGetPayload<{}>): PermissionCatalogItem {
    return {
      key: permission.key,
      category: permission.category,
      label: permission.label,
      description: permission.description,
      adminOnly: permission.adminOnly,
      sortOrder: permission.sortOrder
    };
  }

  private resolvePermissionGroupKeys(permissionKeys: string[]) {
    return Array.from(new Set(permissionKeys));
  }

  private async assertKnownPermissionKeys(permissionKeys: string[]) {
    if (permissionKeys.length === 0) {
      return permissionKeys;
    }

    const catalog = await this.findPermissionCatalog();
    const catalogKeys = new Set(catalog.map((permission) => permission.key));
    const unknownKeys = permissionKeys.filter((permissionKey) => !catalogKeys.has(permissionKey));

    if (unknownKeys.length > 0) {
      throw new ConflictException(`Unknown permission keys: ${unknownKeys.join(", ")}`);
    }

    return permissionKeys;
  }

  private async assertAssignablePermissionGroup(groupId: string | null | undefined) {
    if (groupId === undefined || groupId === null) {
      return;
    }

    const group = await this.prisma.permissionGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        status: true
      }
    });

    if (!group) {
      throw new NotFoundException(`Permission group ${groupId} was not found`);
    }

    if (internalPermissionGroupIds.has(group.id)) {
      throw new ConflictException("System admin account is separated from permission groups");
    }

    if (group.status === PermissionGroupStatus.archived) {
      throw new ConflictException("Archived permission groups cannot be assigned to accounts");
    }
  }

  private async assertSingleSystemAdmin(excludedAccountId?: string) {
    const existingAdmin = await this.prisma.userAccount.findFirst({
      where: {
        adminRole: "system_admin",
        ...(excludedAccountId ? { id: { not: excludedAccountId } } : {})
      },
      select: {
        id: true
      }
    });

    if (existingAdmin) {
      throw new ConflictException("System admin account already exists");
    }
  }

  private async writeAudit(
    tx: Prisma.TransactionClient,
    action: string,
    entityType: string,
    entityId: string,
    beforeValue: unknown,
    afterValue: unknown,
    actorId?: string
  ) {
    await tx.auditLog.create({
      data: {
        actorId,
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

  private isUniqueConstraintOn(error: unknown, field: string) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      return false;
    }

    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.includes(field);
    }

    return typeof target === "string" && target.includes(field);
  }

  private isKeycloakUserEnabled(status: AccountLifecycleStatus) {
    return status === AccountLifecycleStatus.active;
  }

  private async syncKeycloakBeforeUpdate(
    before: Prisma.UserAccountGetPayload<{ include: { employee: true } }>,
    dto: UpdateUserAccountDto
  ) {
    const shouldSync =
      dto.email !== undefined ||
      dto.displayName !== undefined ||
      dto.adminRole !== undefined ||
      dto.accountStatus !== undefined;

    if (!shouldSync) {
      return null;
    }

    const email = dto.email ?? before.email;
    const displayName = dto.displayName ?? before.displayName;
    const adminRole = dto.adminRole ?? before.adminRole;
    const accountStatus = dto.accountStatus ?? before.accountStatus;

    if (before.keycloakUserId.startsWith("local-")) {
      const provisioned = await this.keycloakAdmin.provisionUser({
        email,
        displayName,
        enabled: this.isKeycloakUserEnabled(accountStatus),
        roles: [adminRole],
        username: email
      });

      return { userId: provisioned.id };
    }

    await this.keycloakAdmin.updateUser(before.keycloakUserId, {
      email,
      displayName,
      enabled: this.isKeycloakUserEnabled(accountStatus),
      roles: [adminRole]
    });

    return null;
  }

  private async deliverInviteIfReady(accountId: string, actorId?: string) {
    const account = await this.prisma.userAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        keycloakUserId: true,
        email: true,
        displayName: true,
        accountStatus: true,
        passwordResetRequired: true,
        inviteEmailRequested: true,
        inviteSentAt: true
      }
    });

    if (!account || !account.inviteEmailRequested || account.inviteSentAt) {
      return;
    }

    if (account.accountStatus !== AccountLifecycleStatus.active) {
      await this.writeSystemAudit("account.invite.deferred", "UserAccount", account.id, null, {
        email: account.email,
        reason: "account_not_active",
        accountStatus: account.accountStatus
      }, actorId);
      return;
    }

    if (!account.passwordResetRequired) {
      await this.writeSystemAudit("account.invite.skipped", "UserAccount", account.id, null, {
        email: account.email,
        reason: "no_required_actions"
      }, actorId);
      return;
    }

    if (!(await this.isInviteEmailEnabled())) {
      await this.writeSystemAudit("account.invite.skipped", "UserAccount", account.id, null, {
        email: account.email,
        reason: "invite_email_disabled"
      }, actorId);
      return;
    }

    try {
      await this.keycloakAdmin.sendRequiredActionsEmail(account.keycloakUserId, ["UPDATE_PASSWORD"]);
      const updated = await this.prisma.userAccount.update({
        where: { id: account.id },
        data: {
          inviteSentAt: new Date()
        }
      });

      await this.writeSystemAudit("account.invite.sent", "UserAccount", account.id, account, updated, actorId);
    } catch (error) {
      await this.writeSystemAudit("account.invite.failed", "UserAccount", account.id, null, {
        email: account.email,
        reason: error instanceof Error ? error.message.slice(0, 300) : "unknown_error"
      }, actorId);
    }
  }

  private async isInviteEmailEnabled() {
    if (this.config.get<string>("ACCOUNT_INVITE_EMAIL_ENABLED") === "true") {
      return true;
    }

    return this.adminSettings.isSmtpEmailEnabled();
  }

  private async writeSystemAudit(
    action: string,
    entityType: string,
    entityId: string,
    beforeValue: unknown,
    afterValue: unknown,
    actorId?: string
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        beforeValue: beforeValue === null ? undefined : this.toAuditJson(beforeValue),
        afterValue: this.toAuditJson(afterValue)
      }
    });
  }

  private async writeCatalogAudit(
    action: string,
    entityId: string,
    beforeValue: unknown,
    afterValue: unknown,
    actorId?: string
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType: "PermissionDefinition",
        entityId,
        beforeValue: beforeValue === null ? undefined : this.toAuditJson(beforeValue),
        afterValue: afterValue === null ? undefined : this.toAuditJson(afterValue)
      }
    });
  }
}
