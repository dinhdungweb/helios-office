import { Injectable, OnModuleInit } from "@nestjs/common";
import { EMAIL_QUEUE } from "../common/queue/queue.constants";
import { AdminSettingsService } from "../modules/admin-settings/admin-settings.service";
import type { NotificationEmailJob } from "../modules/notifications/notification-email";
import { WorkerRuntime } from "./worker-runtime.service";

// Sends queued emails with the SMTP settings from Cài đặt > SMTP. Transport errors throw, so BullMQ
// retries (3 attempts, exponential backoff); SMTP switched off is reported, not retried.
@Injectable()
export class EmailProcessor implements OnModuleInit {
  constructor(
    private readonly runtime: WorkerRuntime,
    private readonly adminSettings: AdminSettingsService
  ) {}

  onModuleInit() {
    this.runtime.register<NotificationEmailJob>(
      EMAIL_QUEUE,
      (job) => this.adminSettings.sendEmail({ to: job.data.to, subject: job.data.subject, text: job.data.text, html: job.data.html }),
      // Keep concurrency low to stay under SMTP provider rate limits.
      2
    );
  }
}
