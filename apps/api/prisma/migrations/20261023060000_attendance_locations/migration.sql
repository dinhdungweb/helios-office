-- DV-07: places web/app check-ins are accepted from.
-- CreateEnum
CREATE TYPE "AttendanceLocationType" AS ENUM ('gps', 'wifi', 'ip');

-- CreateTable
CREATE TABLE "AttendanceLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AttendanceLocationType" NOT NULL,
    "workplaceId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusMeters" INTEGER NOT NULL DEFAULT 100,
    "ssid" TEXT,
    "bssid" TEXT,
    "ipRanges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceLocation_workplaceId_idx" ON "AttendanceLocation"("workplaceId");

-- AddForeignKey
ALTER TABLE "AttendanceLocation" ADD CONSTRAINT "AttendanceLocation_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
