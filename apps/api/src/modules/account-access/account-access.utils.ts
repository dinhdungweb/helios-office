export function buildPermissionGroupIdBase(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return `grp-${slug || "group"}`;
}

export function buildPermissionGroupIdCandidate(baseId: string, attempt: number) {
  return attempt <= 1 ? baseId : `${baseId}-${attempt}`;
}

export type PermissionEffectivenessInput = {
  adminRole?: string | null;
  accountStatus?: string | null;
  permissionGroupStatus?: string | null;
  groupPermissionKeys?: readonly string[] | null;
  customPermissionKeys?: unknown;
};

export function resolveCustomPermissionKeys(value: unknown) {
  if (Array.isArray(value)) {
    return normalizePermissionKeys(value);
  }

  if (
    value &&
    typeof value === "object" &&
    "keys" in value &&
    Array.isArray((value as { keys?: unknown }).keys)
  ) {
    return normalizePermissionKeys((value as { keys: unknown[] }).keys);
  }

  return [];
}

export function resolveEffectivePermissionKeys(
  input: PermissionEffectivenessInput,
  catalogKeys: readonly string[]
) {
  if (input.accountStatus !== "active") {
    return [];
  }

  const catalogKeySet = new Set(catalogKeys);
  const rawKeys =
    input.adminRole === "system_admin"
      ? catalogKeys
      : [
          ...(input.permissionGroupStatus === "archived" ? [] : input.groupPermissionKeys ?? []),
          ...resolveCustomPermissionKeys(input.customPermissionKeys)
        ];

  return normalizePermissionKeys(rawKeys).filter((permissionKey) => catalogKeySet.has(permissionKey));
}

function normalizePermissionKeys(value: readonly unknown[]) {
  return Array.from(
    new Set(
      value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    )
  );
}
