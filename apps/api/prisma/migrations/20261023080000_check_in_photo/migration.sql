-- AT-14: check-in photos.
-- AlterTable
ALTER TABLE "DeviceAuthPolicy" ADD COLUMN     "requirePhoto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AttendanceRawLog" ADD COLUMN     "photoFileId" TEXT;
