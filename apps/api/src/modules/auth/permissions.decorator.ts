import { SetMetadata } from "@nestjs/common";

export const REQUIRED_PERMISSIONS_KEY = "helios:required_permissions";

export type PermissionRequirement = {
  all?: string[];
  any?: string[];
};

export function RequirePermissions(...permissions: string[]) {
  return SetMetadata(REQUIRED_PERMISSIONS_KEY, { all: permissions } satisfies PermissionRequirement);
}

export function RequireAnyPermission(...permissions: string[]) {
  return SetMetadata(REQUIRED_PERMISSIONS_KEY, { any: permissions } satisfies PermissionRequirement);
}
