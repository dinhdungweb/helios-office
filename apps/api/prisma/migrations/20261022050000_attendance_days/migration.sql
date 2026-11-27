-- CreateEnum
CREATE TYPE "AttendanceDayStatus" AS ENUM ('on_time', 'late', 'early_leave', 'late_and_early', 'missing_checkin', 'missing_checkout', 'absent', 'holiday', 'day_off');

-- CreateEnum
CREATE TYPE "AttendanceAdjustmentType" AS ENUM ('manual');

-- CreateTable
CREATE TABLE "AttendanceDay" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "shiftId" TEXT,
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyMinutes" INTEGER NOT NULL DEFAULT 0,
    "outsideShiftMinutes" INTEGER NOT NULL DEFAULT 0,
    "nightMinutes" INTEGER NOT NULL DEFAULT 0,
    "workUnits" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "paidLeaveUnits" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "AttendanceDayStatus" NOT NULL,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "holidayType" "HolidayType",
    "punchCount" INTEGER NOT NULL DEFAULT 0,
    "policySnapshot" JSONB,
    "lastChangeSource" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceAdjustment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "type" "AttendanceAdjustmentType" NOT NULL DEFAULT 'manual',
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "punchesSet" BOOLEAN NOT NULL DEFAULT false,
    "workUnits" DECIMAL(5,2),
    "status" "AttendanceDayStatus",
    "reason" TEXT NOT NULL,
    "before" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "AttendanceAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceDay_workDate_idx" ON "AttendanceDay"("workDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceDay_employeeId_workDate_key" ON "AttendanceDay"("employeeId", "workDate");

-- CreateIndex
CREATE INDEX "AttendanceAdjustment_employeeId_workDate_idx" ON "AttendanceAdjustment"("employeeId", "workDate");

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAdjustment" ADD CONSTRAINT "AttendanceAdjustment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
