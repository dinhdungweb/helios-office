CREATE TYPE "PermissionGroupStatus" AS ENUM ('active', 'archived');

ALTER TABLE "PermissionGroup"
  ADD COLUMN "status" "PermissionGroupStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "archivedAt" TIMESTAMP(3);
