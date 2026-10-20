import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../common/prisma/prisma.service";
import { EMAIL_QUEUE, NOTIFICATIONS_QUEUE } from "../common/queue/queue.constants";
import { QueueService } from "../common/queue/queue.service";
import { NotificationDeliveryService, type NotifyInput } from "../modules/notifications/notification-delivery.service";
import { renderNotificationEmail, type NotificationEmailJob } from "../modules/notifications/notification-email";
import { NOTIFICATION_CREATED_EVENT } from "../modules/notifications/notification-realtime";
import { RealtimeEmitter } from "./realtime-emitter.service";
import { WorkerRuntime } from "./worker-runtime.service";

// Consumes notify() jobs: writes in-app notifications, pushes each one to its recipient's sockets
// and queues one email per recipient whose preferences (or the event default) ask for email.
@Injectable()
export class NotificationsProcessor implements OnModuleInit {
  private readonly webOrigin: string;

  constructor(
    private readonly runtime: WorkerRuntime,
    private readonly delivery: NotificationDeliveryService,
    private readonly realtime: RealtimeEmitter,
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    config: ConfigService
  ) {
    const origins = [config.get<string>("WEB_ORIGIN"), ...(config.get<string>("WEB_ORIGINS") ?? "").split(",")];
    this.webOrigin = origins.map((origin) => origin?.trim()).find(Boolean) ?? "http://localhost:3000";
  }

  onModuleInit() {
    this.runtime.register<NotifyInput>(NOTIFICATIONS_QUEUE, (job) => this.process(job.data));
  }

  async process(input: NotifyInput) {
    const result = await this.delivery.deliverInApp(input);

    for (const notification of result.notifications) {
      this.realtime.toAccount(notification.accountId, NOTIFICATION_CREATED_EVENT, notification);
    }

    const recipients = result.emailAccountIds.length
      ? await this.prisma.userAccount.findMany({
          where: { id: { in: result.emailAccountIds } },
          select: { id: true, email: true, displayName: true }
        })
      : [];

    for (const recipient of recipients) {
      const email = renderNotificationEmail({
        recipientName: recipient.displayName,
        title: input.title,
        body: input.body,
        link: input.link,
        webOrigin: this.webOrigin
      });
      const job: NotificationEmailJob = { accountId: recipient.id, event: input.event, to: recipient.email, ...email };
      await this.queue.add(EMAIL_QUEUE, input.event, job);
    }

    return { inApp: result.notifications.length, emailQueued: recipients.length };
  }
}
