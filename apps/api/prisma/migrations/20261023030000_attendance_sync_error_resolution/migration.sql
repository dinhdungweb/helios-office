-- AT-20: how a sync error was handled.
ALTER TABLE "AttendanceSyncError" ADD COLUMN     "resolution" TEXT,
ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT;
