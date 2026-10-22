-- CreateEnum
CREATE TYPE "AttendanceRecalcStatus" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateTable
CREATE TABLE "AttendanceRecalcJob" (
    "id" TEXT NOT NULL,
    "from" DATE NOT NULL,
    "to" DATE NOT NULL,
    "employeeIds" JSONB,
    "reason" TEXT NOT NULL,
    "status" "AttendanceRecalcStatus" NOT NULL DEFAULT 'queued',
    "result" JSONB,
    "error" TEXT,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AttendanceRecalcJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceRecalcJob_createdAt_idx" ON "AttendanceRecalcJob"("createdAt");
