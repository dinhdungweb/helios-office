CREATE TYPE "DeviceAuthStatus" AS ENUM ('pending', 'approved', 'rejected', 'locked');

CREATE TABLE "DeviceAuthPolicy" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "maxDevicesPerUser" INTEGER NOT NULL DEFAULT 1,
  "requireNotificationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "requireGpsForAttendance" BOOLEAN NOT NULL DEFAULT true,
  "requireWifiForOffice" BOOLEAN NOT NULL DEFAULT true,
  "approvalRefreshHint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DeviceAuthPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeviceAuthRequest" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT,
  "employeeCode" TEXT NOT NULL,
  "employeeName" TEXT NOT NULL,
  "avatar" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "branch" TEXT NOT NULL,
  "deviceName" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "status" "DeviceAuthStatus" NOT NULL DEFAULT 'pending',
  "lastUsedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DeviceAuthRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceAuthRequest_deviceId_key" ON "DeviceAuthRequest"("deviceId");
CREATE INDEX "DeviceAuthRequest_employeeId_idx" ON "DeviceAuthRequest"("employeeId");
CREATE INDEX "DeviceAuthRequest_status_idx" ON "DeviceAuthRequest"("status");

ALTER TABLE "DeviceAuthRequest"
  ADD CONSTRAINT "DeviceAuthRequest_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
