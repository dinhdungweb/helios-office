-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('active', 'archived');

-- AlterTable
ALTER TABLE "Department"
ADD COLUMN "status" "DepartmentStatus" NOT NULL DEFAULT 'active',
ADD COLUMN "archivedAt" TIMESTAMP(3);
