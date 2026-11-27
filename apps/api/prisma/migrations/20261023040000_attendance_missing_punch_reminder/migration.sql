-- AT-23: missing-punch reminder settings, the run log and its notification event.
ALTER TABLE "AttendancePolicy" ADD COLUMN "missingPunchReminder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "missingPunchReminderTime" TEXT NOT NULL DEFAULT '08:30';

CREATE TABLE "AttendanceReminderRun" (
    "workDate" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "triggeredById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "notified" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "AttendanceReminderRun_pkey" PRIMARY KEY ("workDate")
);

INSERT INTO "NotificationEventType" ("key", "module", "label", "defaultEmail", "mandatory")
VALUES ('attendance.missing_punch', 'attendance', 'Nhắc quên chấm công', false, false)
ON CONFLICT ("key") DO NOTHING;
