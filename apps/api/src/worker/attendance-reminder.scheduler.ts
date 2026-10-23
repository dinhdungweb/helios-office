import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { AttendanceReminderService } from "../modules/attendance/attendance-reminder.service";

const FIRST_RUN_DELAY_MS = 30_000;
const INTERVAL_MS = 5 * 60_000;

// AT-23: checks every 5 minutes whether yesterday's missing-punch reminders are due; the run row
// keyed by date keeps it to once a day across workers and restarts.
@Injectable()
export class AttendanceReminderScheduler implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("AttendanceReminder");
  private timers: NodeJS.Timeout[] = [];

  constructor(private readonly reminders: AttendanceReminderService) {}

  onModuleInit() {
    this.timers.push(setTimeout(() => void this.run(), FIRST_RUN_DELAY_MS));
    this.timers.push(setInterval(() => void this.run(), INTERVAL_MS));
  }

  onApplicationShutdown() {
    this.timers.forEach((timer) => clearTimeout(timer));
  }

  async run() {
    try {
      await this.reminders.tick();
    } catch (error) {
      this.logger.warn(`Missing-punch reminder failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}
