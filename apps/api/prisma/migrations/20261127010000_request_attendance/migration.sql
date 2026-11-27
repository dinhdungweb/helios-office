-- Phase 3b task 9 (AT-22, LV-18): approved overtime minutes on each work day.
ALTER TABLE "AttendanceDay" ADD COLUMN "overtimeMinutes" INTEGER NOT NULL DEFAULT 0;
