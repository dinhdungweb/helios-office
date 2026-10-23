-- AlterTable
ALTER TABLE "AttendanceDevice" ADD COLUMN     "note" TEXT,
ADD COLUMN     "workplaceId" TEXT;

-- AddForeignKey
ALTER TABLE "AttendanceDevice" ADD CONSTRAINT "AttendanceDevice_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
