-- Like 1Office's Timekeeping settings: GPS and Wifi check-ins each get their own rules, the old
-- single switches are copied to both; shifts list the places they accept; consecutive days without
-- a check-in/out default to 2 as in 1Office.
ALTER TABLE "DeviceAuthPolicy"
  ADD COLUMN "gpsAllowWithoutShift" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "gpsRequireApprovedDevice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "gpsRequirePhoto" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "gpsCheckEntities" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "wifiAllowWithoutShift" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "wifiRequireApprovedDevice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "wifiRequirePhoto" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "wifiCheckEntities" BOOLEAN NOT NULL DEFAULT false;

UPDATE "DeviceAuthPolicy" SET
  "gpsRequireApprovedDevice" = "requireApprovedDevice",
  "wifiRequireApprovedDevice" = "requireApprovedDevice",
  "gpsRequirePhoto" = "requirePhoto",
  "wifiRequirePhoto" = "requirePhoto";

ALTER TABLE "DeviceAuthPolicy" DROP COLUMN "requireApprovedDevice", DROP COLUMN "requirePhoto";

ALTER TABLE "Shift" ADD COLUMN "locationIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "AttendancePolicy" ALTER COLUMN "continuousShiftMaxDays" SET DEFAULT 2;
UPDATE "AttendancePolicy" SET "continuousShiftMaxDays" = 2 WHERE "continuousShiftMaxDays" < 2;
