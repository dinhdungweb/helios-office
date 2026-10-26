-- AT-28: 1Office-style general attendance settings.
-- AlterTable
ALTER TABLE "AttendancePolicy" ADD COLUMN     "continuousShiftMaxDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lateEarlyUnit" TEXT NOT NULL DEFAULT 'minute',
ADD COLUMN     "overnightSplit" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "shiftCreateAheadDays" INTEGER,
ADD COLUMN     "shiftEditWindowDays" INTEGER;
