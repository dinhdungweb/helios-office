-- AT-13 / DV-06: web and app check-ins as raw logs; policy switch for approved devices.
-- AlterTable
ALTER TABLE "DeviceAuthPolicy" ADD COLUMN     "requireApprovedDevice" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "AttendanceRawLog" ADD COLUMN     "accuracyMeters" DOUBLE PRECISION,
ADD COLUMN     "bssid" TEXT,
ADD COLUMN     "clientDeviceId" TEXT,
ADD COLUMN     "clientDeviceName" TEXT,
ADD COLUMN     "direction" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'machine',
ADD COLUMN     "ssid" TEXT,
ALTER COLUMN "deviceId" DROP NOT NULL;
