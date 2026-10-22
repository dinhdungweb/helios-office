-- CreateEnum
CREATE TYPE "AttendancePeriodStatus" AS ENUM ('open', 'locked');

-- CreateTable
CREATE TABLE "AttendancePeriod" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" "AttendancePeriodStatus" NOT NULL DEFAULT 'open',
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "note" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "unlockedById" TEXT,
    "unlockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePeriod_month_key" ON "AttendancePeriod"("month");

-- Permission to lock and unlock attendance periods (AT-17).
INSERT INTO "PermissionDefinition" ("key", "category", "label", "adminOnly", "scopable", "sortOrder", "createdAt", "updatedAt")
VALUES ('permission.attendance-period.lock', 'Chi tiết quyền', 'attendance-period lock', false, false, 1000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
