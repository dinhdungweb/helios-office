import type { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationDeliveryService, type NotifyInput } from "./notification-delivery.service";

type Account = { id: string; accountStatus: string; employee: { id: string; departmentId: string } | null };

const accounts: Account[] = [
  { id: "acc-hr", accountStatus: "active", employee: { id: "emp-hr", departmentId: "hr" } },
  { id: "acc-sales-1", accountStatus: "active", employee: { id: "emp-sales-1", departmentId: "sales" } },
  { id: "acc-sales-2", accountStatus: "active", employee: { id: "emp-sales-2", departmentId: "sales" } },
  { id: "acc-closed", accountStatus: "closed", employee: { id: "emp-closed", departmentId: "sales" } },
  { id: "acc-admin", accountStatus: "active", employee: null }
];

type Condition = { id?: { in: string[] }; employee?: { id?: { in: string[] }; departmentId?: { in: string[] } } };

function matches(account: Account, condition: Condition) {
  if (condition.id) return condition.id.in.includes(account.id);
  if (condition.employee?.id) return Boolean(account.employee && condition.employee.id.in.includes(account.employee.id));
  if (condition.employee?.departmentId) {
    return Boolean(account.employee && condition.employee.departmentId.in.includes(account.employee.departmentId));
  }
  return true; // {} = everyone
}

let preferences: Array<{ accountId: string; event: string; inApp: boolean; email: boolean }> = [];
let eventType: { key: string; defaultEmail: boolean; mandatory: boolean } | null = null;
let created: Array<{ accountId: string }> = [];

const prisma = {
  userAccount: {
    findMany: async ({ where }: { where: { accountStatus: string; OR: Condition[] } }) =>
      accounts.filter((account) => account.accountStatus === where.accountStatus && where.OR.some((condition) => matches(account, condition)))
  },
  notificationEventType: { findUnique: async () => eventType },
  notificationPreference: {
    findMany: async ({ where }: { where: { accountId: { in: string[] }; event: { in: string[] } } }) =>
      preferences.filter((item) => where.accountId.in.includes(item.accountId) && where.event.in.includes(item.event))
  },
  notification: {
    createManyAndReturn: async ({ data }: { data: Array<{ accountId: string }> }) => {
      created = data;
      return data.map((row, index) => ({ id: `n-${index}`, ...row, createdAt: new Date() }));
    }
  }
} as unknown as PrismaService;

const service = new NotificationDeliveryService(prisma);

const input = (overrides: Partial<NotifyInput> = {}): NotifyInput => ({
  event: "request.approved",
  recipients: { accountIds: ["acc-hr"] },
  title: "Đơn được duyệt",
  ...overrides
});

beforeEach(() => {
  preferences = [];
  eventType = { key: "request.approved", defaultEmail: true, mandatory: false };
  created = [];
});

describe("NotificationDeliveryService.resolveRecipients", () => {
  it("combines account, employee and department targets, deduplicated, active accounts only", async () => {
    const ids = await service.resolveRecipients({ accountIds: ["acc-hr"], employeeIds: ["emp-sales-1"], departmentIds: ["sales"] });
    expect(ids.sort()).toEqual(["acc-hr", "acc-sales-1", "acc-sales-2"]);
  });

  it("all = every active account", async () => {
    expect((await service.resolveRecipients({ all: true })).sort()).toEqual(["acc-admin", "acc-hr", "acc-sales-1", "acc-sales-2"]);
  });

  it("no target = nobody", async () => {
    expect(await service.resolveRecipients({})).toEqual([]);
  });
});

describe("NotificationDeliveryService.deliverInApp", () => {
  it("skips the actor unless includeActor is set", async () => {
    await service.deliverInApp(input({ recipients: { departmentIds: ["sales"] }, actorAccountId: "acc-sales-1" }));
    expect(created.map((row) => row.accountId)).toEqual(["acc-sales-2"]);

    await service.deliverInApp(input({ recipients: { departmentIds: ["sales"] }, actorAccountId: "acc-sales-1", includeActor: true }));
    expect(created.map((row) => row.accountId).sort()).toEqual(["acc-sales-1", "acc-sales-2"]);
  });

  it("uses the event's email default when the account has no preference", async () => {
    const result = await service.deliverInApp(input());
    expect(result.emailAccountIds).toEqual(["acc-hr"]);
  });

  it("an event-specific preference beats the account-wide '*' preference", async () => {
    preferences = [
      { accountId: "acc-hr", event: "*", inApp: true, email: true },
      { accountId: "acc-hr", event: "request.approved", inApp: false, email: false }
    ];
    const result = await service.deliverInApp(input());
    expect(result.notifications).toHaveLength(0);
    expect(result.emailAccountIds).toEqual([]);
  });

  it("mandatory events ignore preferences", async () => {
    eventType = { key: "payslip.published", defaultEmail: true, mandatory: true };
    preferences = [{ accountId: "acc-hr", event: "payslip.published", inApp: false, email: false }];
    const result = await service.deliverInApp(input({ event: "payslip.published" }));
    expect(result.notifications).toHaveLength(1);
    expect(result.emailAccountIds).toEqual(["acc-hr"]);
  });

  it("unknown events default to in-app only", async () => {
    eventType = null;
    const result = await service.deliverInApp(input({ event: "custom.event" }));
    expect(result.notifications).toHaveLength(1);
    expect(result.emailAccountIds).toEqual([]);
  });
});
