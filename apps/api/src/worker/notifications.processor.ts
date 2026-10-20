import { Injectable, OnModuleInit } from "@nestjs/common";
import { NOTIFICATIONS_QUEUE } from "../common/queue/queue.constants";
import { NotificationDeliveryService, type NotifyInput } from "../modules/notifications/notification-delivery.service";
import { WorkerRuntime } from "./worker-runtime.service";

// Consumes notify() jobs: writes in-app notifications. Realtime push (CORE-17) and email (NT-06)
// hook in here.
@Injectable()
export class NotificationsProcessor implements OnModuleInit {
  constructor(
    private readonly runtime: WorkerRuntime,
    private readonly delivery: NotificationDeliveryService
  ) {}

  onModuleInit() {
    this.runtime.register<NotifyInput>(NOTIFICATIONS_QUEUE, async (job) => {
      const result = await this.delivery.deliverInApp(job.data);
      return { inApp: result.notifications.length, email: result.emailAccountIds.length };
    });
  }
}
