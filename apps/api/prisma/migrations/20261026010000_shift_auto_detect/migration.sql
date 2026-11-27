-- AT-29: shifts detected from punches on days without an assignment.
-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "applyDepartmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "applyPositionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "autoDetect" BOOLEAN NOT NULL DEFAULT false;
