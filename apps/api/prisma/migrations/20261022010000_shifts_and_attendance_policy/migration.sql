-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('fixed', 'flexible');

-- CreateEnum
CREATE TYPE "LateCountMode" AS ENUM ('full', 'excess');

-- CreateEnum
CREATE TYPE "PunchPairingMode" AS ENUM ('first_last', 'pairs');

-- CreateEnum
CREATE TYPE "OvernightAttribution" AS ENUM ('shift_start', 'shift_end');

-- CreateEnum
CREATE TYPE "MissingPunchMode" AS ENUM ('pending', 'half', 'scheduled');

-- CreateEnum
CREATE TYPE "WorkUnitMode" AS ENUM ('actual', 'presence');

-- CreateEnum
CREATE TYPE "OutsideShiftMode" AS ENUM ('record', 'ignore');

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "defaultShiftId" TEXT;

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ShiftType" NOT NULL DEFAULT 'fixed',
    "color" TEXT,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "breakStartMinute" INTEGER,
    "breakEndMinute" INTEGER,
    "requiredMinutes" INTEGER,
    "workUnits" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "lateGraceMinutes" INTEGER,
    "earlyGraceMinutes" INTEGER,
    "lateCountMode" "LateCountMode",
    "missingPunchMode" "MissingPunchMode",
    "punchWindowBeforeMinutes" INTEGER,
    "punchWindowAfterMinutes" INTEGER,
    "description" TEXT,
    "status" "JobCatalogStatus" NOT NULL DEFAULT 'active',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePolicy" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "workWeekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "defaultShiftId" TEXT,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 5,
    "earlyGraceMinutes" INTEGER NOT NULL DEFAULT 5,
    "lateCountMode" "LateCountMode" NOT NULL DEFAULT 'full',
    "roundingMinutes" INTEGER NOT NULL DEFAULT 0,
    "punchPairing" "PunchPairingMode" NOT NULL DEFAULT 'first_last',
    "punchWindowBeforeMinutes" INTEGER NOT NULL DEFAULT 240,
    "punchWindowAfterMinutes" INTEGER NOT NULL DEFAULT 240,
    "overnightAttribution" "OvernightAttribution" NOT NULL DEFAULT 'shift_start',
    "missingPunchMode" "MissingPunchMode" NOT NULL DEFAULT 'pending',
    "workUnitMode" "WorkUnitMode" NOT NULL DEFAULT 'actual',
    "workUnitRoundingHundredths" INTEGER NOT NULL DEFAULT 1,
    "outsideShiftMode" "OutsideShiftMode" NOT NULL DEFAULT 'record',
    "overtimeWeekdayPercent" INTEGER NOT NULL DEFAULT 150,
    "overtimeRestDayPercent" INTEGER NOT NULL DEFAULT 200,
    "overtimeHolidayPercent" INTEGER NOT NULL DEFAULT 300,
    "nightAllowancePercent" INTEGER NOT NULL DEFAULT 30,
    "holidayPaid" BOOLEAN NOT NULL DEFAULT true,
    "requireTimesheetConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shift_code_key" ON "Shift"("code");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_defaultShiftId_fkey" FOREIGN KEY ("defaultShiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePolicy" ADD CONSTRAINT "AttendancePolicy_defaultShiftId_fkey" FOREIGN KEY ("defaultShiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed (docs/design/attendance-engine.md §4, §5.2): office shift 08:00-17:00 with a 12:00-13:00
-- break (480 working minutes, 1 unit), and the company policy pointing at it. HR adjusts both later.
INSERT INTO "Shift" ("id", "code", "name", "type", "startMinute", "endMinute", "breakStartMinute", "breakEndMinute", "requiredMinutes", "workUnits", "color", "description", "updatedAt")
VALUES ('shift-hc', 'HC', 'Hành chính', 'fixed', 480, 1020, 720, 780, 480, 1, '#2563eb', 'Ca hành chính mặc định', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "AttendancePolicy" ("id", "defaultShiftId", "updatedAt")
VALUES ('default', 'shift-hc', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
