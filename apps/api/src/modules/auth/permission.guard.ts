import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { accountPermissionCatalog } from "../../common/mock-data";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  resolveCustomPermissionKeys,
  resolveEffectivePermissionKeys
} from "../account-access/account-access.utils";
import {
  REQUIRED_PERMISSIONS_KEY,
  type PermissionRequirement
} from "./permissions.decorator";
import type { RequestWithUser } from "./auth.types";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext) {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requirement || this.isEmptyRequirement(requirement)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const account = request.user?.account;

    if (!account) {
      throw new UnauthorizedException("Authenticated account is required");
    }

    if (account.adminRole === "system_admin") {
      return true;
    }

    const effectivePermissionKeys = await this.getEffectivePermissionKeys(account.id);

    if (this.matchesRequirement(effectivePermissionKeys, requirement)) {
      return true;
    }

    throw new ForbiddenException("Required permission is missing");
  }

  private async getEffectivePermissionKeys(accountId: string) {
    const [account, catalog] = await Promise.all([
      this.prisma.userAccount.findUnique({
        where: { id: accountId },
        include: {
          permissionGroup: true
        }
      }),
      this.prisma.permissionDefinition.findMany({
        select: { key: true }
      })
    ]);

    if (!account) {
      throw new UnauthorizedException("Authenticated account was not found");
    }

    const catalogKeys = catalog.length > 0
      ? catalog.map((permission) => permission.key)
      : accountPermissionCatalog.map((permission) => permission.key);

    return resolveEffectivePermissionKeys(
      {
        adminRole: account.adminRole,
        accountStatus: account.accountStatus,
        permissionGroupStatus: account.permissionGroup?.status,
        groupPermissionKeys: account.permissionGroup?.permissions,
        customPermissionKeys: account.customPermissionsEnabled
          ? resolveCustomPermissionKeys(account.customPermissions)
          : []
      },
      catalogKeys
    );
  }

  private isEmptyRequirement(requirement: PermissionRequirement) {
    return (requirement.all?.length ?? 0) === 0 && (requirement.any?.length ?? 0) === 0;
  }

  private matchesRequirement(effectivePermissionKeys: string[], requirement: PermissionRequirement) {
    const effectiveSet = new Set(effectivePermissionKeys);
    const hasAll = (requirement.all ?? []).every((permissionKey) => effectiveSet.has(permissionKey));
    const hasAny =
      !requirement.any ||
      requirement.any.length === 0 ||
      requirement.any.some((permissionKey) => effectiveSet.has(permissionKey));

    return hasAll && hasAny;
  }
}
