import type { ConfigService } from "@nestjs/config";
import type { PrismaService } from "../common/prisma/prisma.service";
import { EMAIL_QUEUE } from "../common/queue/queue.constants";
import type { QueueService } from "../common/queue/queue.service";
import type { NotificationDeliveryService } from "../modules/notifications/notification-delivery.service";
import { NotificationsProcessor } from "./notifications.processor";
import type { RealtimeEmitter } from "./realtime-emitter.service";
import type { WorkerRuntime } from "./worker-runtime.service";

describe("NotificationsProcessor", () => {
  const emitted: Array<{ accountId: string; event: string }> = [];
  const queued: Array<{ queue: string; data: { to: string; subject: string; html: string } }> = [];

  const processor = new NotificationsProcessor(
    {} as WorkerRuntime,
    {
      deliverInApp: async () => ({
        notifications: [
          { id: "n1", accountId: "acc-1", event: "request.approved", title: "Đơn được duyệt", body: null, link: "/user/requests", createdAt: new Date() },
          { id: "n2", accountId: "acc-2", event: "request.approved", title: "Đơn được duyệt", body: null, link: "/user/requests", createdAt: new Date() }
        ],
        emailAccountIds: ["acc-2"]
      })
    } as unknown as NotificationDeliveryService,
    { toAccount: (accountId: string, event: string) => emitted.push({ accountId, event }) } as unknown as RealtimeEmitter,
    { userAccount: { findMany: async () => [{ id: "acc-2", email: "acc2@helios.vn", displayName: "Người Hai" }] } } as unknown as PrismaService,
    { add: async (queue: string, _name: string, data: never) => queued.push({ queue, data }) } as unknown as QueueService,
    { get: (key: string) => (key === "WEB_ORIGINS" ? "https://office.helios.vn,http://localhost:3000" : undefined) } as unknown as ConfigService
  );

  it("pushes every in-app notification and queues email only for email recipients", async () => {
    const result = await processor.process({
      event: "request.approved",
      recipients: { accountIds: ["acc-1", "acc-2"] },
      title: "Đơn được duyệt",
      link: "/user/requests"
    });

    expect(result).toEqual({ inApp: 2, emailQueued: 1 });
    expect(emitted).toEqual([
      { accountId: "acc-1", event: "notification.created" },
      { accountId: "acc-2", event: "notification.created" }
    ]);
    expect(queued).toHaveLength(1);
    expect(queued[0].queue).toBe(EMAIL_QUEUE);
    expect(queued[0].data.to).toBe("acc2@helios.vn");
    expect(queued[0].data.html).toContain("https://office.helios.vn/user/requests");
  });
});
