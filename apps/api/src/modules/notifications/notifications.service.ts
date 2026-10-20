import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { pageArgs, paginated } from "../../common/pagination/list-query";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NOTIFICATIONS_QUEUE } from "../../common/queue/queue.constants";
import { QueueService, QueueUnavailableError } from "../../common/queue/queue.service";
import { NotificationDeliveryService, type NotifyInput } from "./notification-delivery.service";
import type { NotificationQueryDto } from "./notifications.dto";

const notificationSelect = {
  id: true,
  event: true,
  title: true,
  body: true,
  link: true,
  data: true,
  readAt: true,
  createdAt: true
} as const;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly delivery: NotificationDeliveryService
  ) {}

  // Single entry point for every module (docs/design/notification.md §2). Queues one job and
  // returns; the worker resolves recipients, writes notifications, pushes realtime and email.
  // Without Redis it writes in-app notifications directly so nothing is lost.
  async notify(input: NotifyInput): Promise<{ queued: boolean; delivered?: number }> {
    try {
      await this.queue.add(NOTIFICATIONS_QUEUE, input.event, input);
      return { queued: true };
    } catch (error) {
      if (!(error instanceof QueueUnavailableError)) throw error;

      this.logger.warn(`Queue unavailable, delivering "${input.event}" in-app only: ${error.message}`);
      const result = await this.delivery.deliverInApp(input);
      return { queued: false, delivered: result.notifications.length };
    }
  }

  async list(accountId: string, query: NotificationQueryDto) {
    const where = { accountId, ...(query.unread === "true" ? { readAt: null } : {}) };
    const { skip, take } = pageArgs(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, select: notificationSelect, orderBy: { createdAt: "desc" }, skip, take }),
      this.prisma.notification.count({ where })
    ]);

    return paginated(items, total, query);
  }

  async unreadCount(accountId: string) {
    return { count: await this.prisma.notification.count({ where: { accountId, readAt: null } }) };
  }

  // Someone else's notification is reported as missing.
  async markRead(accountId: string, id: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, accountId, readAt: null },
      data: { readAt: new Date() }
    });

    if (count === 0 && !(await this.prisma.notification.count({ where: { id, accountId } }))) {
      throw new NotFoundException(`Notification ${id} was not found`);
    }

    return { id, read: true };
  }

  async markAllRead(accountId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { accountId, readAt: null },
      data: { readAt: new Date() }
    });

    return { updated: count };
  }
}
