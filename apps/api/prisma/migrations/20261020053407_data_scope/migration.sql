-- AlterTable
ALTER TABLE "PermissionDefinition" ADD COLUMN     "defaultScope" TEXT,
ADD COLUMN     "scopable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PermissionGroup" ADD COLUMN     "permissionScopes" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "UserAccount" ADD COLUMN     "customPermissionScopes" JSONB;

-- Data: scopable permissions. Keep in sync with src/common/data-scope/scopable-permissions.ts.
CREATE TEMP TABLE "_scopable_permission" ("key" TEXT PRIMARY KEY);
INSERT INTO "_scopable_permission" ("key") VALUES
  ('permission.attendance.view'), ('permission.attendance.manage'),
  ('permission.attendance-timesheets.view'), ('permission.attendance-timesheets.manage'),
  ('permission.requests.view'), ('permission.requests.manage'),
  ('permission.approvals.view'), ('permission.approvals.manage'),
  ('permission.payroll.view'), ('permission.payroll.manage'),
  ('permission.insurance.view'), ('permission.insurance.manage'),
  ('permission.hrm-employees.view'), ('permission.hrm-employees.manage'),
  ('permission.hrm-contracts.view'), ('permission.hrm-contracts.manage'),
  ('permission.hrm-decisions.view'), ('permission.hrm-decisions.manage'),
  ('permission.kpi-goals.view'), ('permission.kpi-goals.manage'),
  ('permission.kpi-evaluation.view'), ('permission.kpi-evaluation.manage'),
  ('permission.performance-reviews.view'), ('permission.performance-reviews.manage'),
  ('permission.training.view'), ('permission.training.manage'),
  ('permission.assets.view'), ('permission.assets.manage'),
  ('permission.work-timesheet.view'), ('permission.work-timesheet.manage'),
  ('employees.department.manage'),
  ('hr.dashboard.people.view'), ('hr.dashboard.attendance.view'), ('hr.dashboard.contracts.view'),
  ('hr.dashboard.requests.view'), ('hr.dashboard.birthdays.view'), ('hr.dashboard.analytics.view'),
  ('hr.dashboard.organization.view'),
  ('reports.company.view');

-- New grants default to the account's department.
UPDATE "PermissionDefinition"
SET "scopable" = true, "defaultScope" = 'department'
WHERE "key" IN (SELECT "key" FROM "_scopable_permission");

-- Existing grants keep company-wide visibility so nobody loses data on deploy (design decision 2).
UPDATE "PermissionGroup" AS g
SET "permissionScopes" = COALESCE(
  (
    SELECT jsonb_object_agg(k, 'company')
    FROM unnest(g."permissions") AS k
    WHERE k IN (SELECT "key" FROM "_scopable_permission")
  ),
  '{}'::jsonb
);

-- Custom grants are stored either as a JSON array of keys or as { "keys": [...] }.
UPDATE "UserAccount" AS a
SET "customPermissionScopes" = (
  SELECT jsonb_object_agg(k, 'company')
  FROM jsonb_array_elements_text(
    CASE
      WHEN jsonb_typeof(a."customPermissions") = 'array' THEN a."customPermissions"
      WHEN jsonb_typeof(a."customPermissions" -> 'keys') = 'array' THEN a."customPermissions" -> 'keys'
      ELSE '[]'::jsonb
    END
  ) AS k
  WHERE k IN (SELECT "key" FROM "_scopable_permission")
)
WHERE a."customPermissions" IS NOT NULL;

DROP TABLE "_scopable_permission";
