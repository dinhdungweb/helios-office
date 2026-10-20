import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

export type NotifyRecipients = {
  accountIds?: string[];
  employeeIds?: string[];
  departmentIds?: string[];
  all?: boolean;
};

export type NotifyInput = {
  event: string;
  recipients: NotifyRecipients;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;
  actorAccountId?: string;
  // The account that caused the event is skipped unless this is set.
  includeActor?: boolean;
};

export type DeliveryResult = {
  notifications: Array<{ id: string; accountId: string; event: string; title: string; body: string | null; link: string | null; createdAt: Date }>;
  emailAccountIds: string[];
};

// Turns a notify() request into rows: resolves recipients, applies preferences and writes the
// in-app notifications. Shared by the worker (normal path) and the API (fallback when Redis is down).
@Injectable()
export class NotificationDeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveRecipients(recipients: NotifyRecipients): Promise<string[]> {
    const conditions: Prisma.UserAccountWhereInput[] = [];

    if (recipients.all) conditions.push({});
    if (recipients.accountIds?.length) conditions.push({ id: { in: recipients.accountIds } });
    if (recipients.employeeIds?.length) conditions.push({ employee: { id: { in: recipients.employeeIds } } });
    if (recipients.departmentIds?.length) conditions.push({ employee: { departmentId: { in: recipients.departmentIds } } });

    if (conditions.length === 0) {
      return [];
    }

    const accounts = await this.prisma.userAccount.findMany({
      where: { accountStatus: "active", OR: conditions },
      select: { id: true }
    });

    return [...new Set(accounts.map((account) => account.id))];
  }

  async deliverInApp(input: NotifyInput): Promise<DeliveryResult> {
    const accountIds = (await this.resolveRecipients(input.recipients)).filter(
      (accountId) => input.includeActor || accountId !== input.actorAccountId
    );

    if (accountIds.length === 0) {
      return { notifications: [], emailAccountIds: [] };
    }

    const [eventType, preferences] = await Promise.all([
      this.prisma.notificationEventType.findUnique({ where: { key: input.event } }),
      this.prisma.notificationPreference.findMany({
        where: { accountId: { in: accountIds }, event: { in: [input.event, "*"] } }
      })
    ]);
    const mandatory = eventType?.mandatory ?? false;
    const defaultEmail = eventType?.defaultEmail ?? false;
    const inAppAccountIds: string[] = [];
    const emailAccountIds: string[] = [];

    for (const accountId of accountIds) {
      const preference =
        preferences.find((item) => item.accountId === accountId && item.event === input.event) ??
        preferences.find((item) => item.accountId === accountId && item.event === "*");

      if (mandatory || (preference?.inApp ?? true)) inAppAccountIds.push(accountId);
      if (mandatory ? defaultEmail : preference?.email ?? defaultEmail) emailAccountIds.push(accountId);
    }

    const notifications = inAppAccountIds.length
      ? await this.prisma.notification.createManyAndReturn({
          data: inAppAccountIds.map((accountId) => ({
            accountId,
            event: input.event,
            title: input.title,
            body: input.body,
            link: input.link,
            data: input.data as Prisma.InputJsonValue | undefined,
            actorAccountId: input.actorAccountId
          })),
          select: { id: true, accountId: true, event: true, title: true, body: true, link: true, createdAt: true }
        })
      : [];

    return { notifications, emailAccountIds };
  }
}
