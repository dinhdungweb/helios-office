-- Match 1Office: late/early minutes are recorded in full, no grace by default (HR can still set one).
ALTER TABLE "AttendancePolicy" ALTER COLUMN "lateGraceMinutes" SET DEFAULT 0,
ALTER COLUMN "earlyGraceMinutes" SET DEFAULT 0;

UPDATE "AttendancePolicy" SET "lateGraceMinutes" = 0 WHERE "id" = 'default' AND "lateGraceMinutes" = 5;
UPDATE "AttendancePolicy" SET "earlyGraceMinutes" = 0 WHERE "id" = 'default' AND "earlyGraceMinutes" = 5;
