ALTER TABLE "Department"
ADD COLUMN "permissionStructure" TEXT NOT NULL DEFAULT 'department',
ADD COLUMN "departmentType" TEXT,
ADD COLUMN "businessUnit" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "isManagementUnit" BOOLEAN NOT NULL DEFAULT false;
