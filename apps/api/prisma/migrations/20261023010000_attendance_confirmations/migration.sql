-- CreateEnum
CREATE TYPE "AttendanceConfirmationStatus" AS ENUM ('confirmed', 'feedback');

-- AlterTable
ALTER TABLE "AttendancePeriod" ADD COLUMN     "confirmationOpenedAt" TIMESTAMP(3),
ADD COLUMN     "confirmationOpenedById" TEXT;

-- CreateTable
CREATE TABLE "AttendanceConfirmation" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" "AttendanceConfirmationStatus" NOT NULL,
    "feedback" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceConfirmation_month_idx" ON "AttendanceConfirmation"("month");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceConfirmation_employeeId_month_key" ON "AttendanceConfirmation"("employeeId", "month");

-- AddForeignKey
ALTER TABLE "AttendanceConfirmation" ADD CONSTRAINT "AttendanceConfirmation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
