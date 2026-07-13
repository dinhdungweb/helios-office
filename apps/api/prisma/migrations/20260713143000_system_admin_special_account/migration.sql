-- Normalize the system admin into an account-only special user.
UPDATE "Employee"
SET "userAccountId" = NULL
WHERE "userAccountId" IN (
  SELECT "id"
  FROM "UserAccount"
  WHERE "adminRole" = 'system_admin'
);

UPDATE "UserAccount"
SET
  "displayName" = 'Admin',
  "permissionGroupId" = NULL,
  "customPermissionsEnabled" = false,
  "customPermissions" = '[]'::jsonb,
  "customPermissionNote" = NULL
WHERE "adminRole" = 'system_admin';

CREATE UNIQUE INDEX "UserAccount_single_system_admin_idx"
ON "UserAccount" ("adminRole")
WHERE "adminRole" = 'system_admin';
