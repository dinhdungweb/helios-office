CREATE TABLE "AttendanceDevice" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "storeCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceRawLog" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "storeCode" TEXT,
    "punchTime" TIMESTAMP(3) NOT NULL,
    "verifyType" TEXT,
    "rawPayload" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRawLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceSyncError" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "employeeCode" TEXT,
    "storeCode" TEXT,
    "punchTime" TIMESTAMP(3),
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSyncError_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceDevice_deviceId_key" ON "AttendanceDevice"("deviceId");
CREATE UNIQUE INDEX "AttendanceRawLog_deviceId_employeeCode_punchTime_key" ON "AttendanceRawLog"("deviceId", "employeeCode", "punchTime");
CREATE INDEX "AttendanceRawLog_employeeId_punchTime_idx" ON "AttendanceRawLog"("employeeId", "punchTime");
CREATE INDEX "AttendanceSyncError_deviceId_createdAt_idx" ON "AttendanceSyncError"("deviceId", "createdAt");
CREATE INDEX "AttendanceSyncError_employeeCode_createdAt_idx" ON "AttendanceSyncError"("employeeCode", "createdAt");

ALTER TABLE "AttendanceRawLog" ADD CONSTRAINT "AttendanceRawLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AttendanceDevice"("deviceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceRawLog" ADD CONSTRAINT "AttendanceRawLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceSyncError" ADD CONSTRAINT "AttendanceSyncError_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AttendanceDevice"("deviceId") ON DELETE RESTRICT ON UPDATE CASCADE;
