import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceReminderService, MISSING_PUNCH_EVENT } from "./attendance-reminder.service";

const user: AuthenticatedUser = {
  sub: "kc-1",
  roles: [],
  claims: {},
  account: { id: "acc-hr", email: "hr@helios.test", displayName: "HR", employeeId: "emp-hr", adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
};

// 2026-10-23 08:29 and 08:31 in Asia/Ho_Chi_Minh (UTC+7).
const BEFORE = Date.parse("2026-10-23T01:29:00.000Z");
const AFTER = Date.parse("2026-10-23T01:31:00.000Z");

function setup(options: { enabled?: boolean; claimed?: boolean; locked?: boolean } = {}) {
  const prisma = {
    attendanceReminderRun: {
      create: options.claimed
        ? jest.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "7" }))
        : jest.fn().mockResolvedValue({}),
      upsert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn()
    },
    attendanceDay: {
      findMany: jest.fn().mockResolvedValue([
        { employeeId: "e1", status: "missing_checkout", checkIn: new Date("2026-10-22T01:02:00.000Z"), checkOut: null, shift: { code: "HC", name: "Hành chính" } },
        { employeeId: "e2", status: "missing_checkin", checkIn: null, checkOut: new Date("2026-10-22T10:35:00.000Z"), shift: null }
      ])
    }
  };
  const calculation = {
    getPolicy: jest.fn().mockResolvedValue({ timezone: "Asia/Ho_Chi_Minh", missingPunchReminder: options.enabled ?? true, missingPunchReminderTime: "08:30" }),
    timezone: jest.fn().mockResolvedValue("Asia/Ho_Chi_Minh")
  };
  const periods = { lockedMonths: jest.fn().mockResolvedValue(new Set(options.locked ? ["2026-10"] : [])) };
  const notifications = { notify: jest.fn().mockResolvedValue({ queued: true }) };
  const service = new AttendanceReminderService(prisma as never, calculation as never, periods as never, notifications as never);
  return { service, prisma, notifications };
}

describe("AttendanceReminderService (AT-23)", () => {
  it("waits for the reminder time, then reminds yesterday's missing punches once", async () => {
    const { service, prisma, notifications } = setup();
    await expect(service.tick(BEFORE)).resolves.toBeNull();
    expect(prisma.attendanceReminderRun.create).not.toHaveBeenCalled();

    await expect(service.tick(AFTER)).resolves.toEqual({ workDate: "2026-10-22", notified: 2 });
    expect(prisma.attendanceReminderRun.create).toHaveBeenCalledWith({ data: { workDate: "2026-10-22", trigger: "auto" } });
    const where = prisma.attendanceDay.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ workDate: new Date("2026-10-22T00:00:00.000Z"), status: { in: ["missing_checkin", "missing_checkout"] }, employee: { status: { not: "resigned" } } });

    expect(notifications.notify).toHaveBeenNthCalledWith(1, {
      event: MISSING_PUNCH_EVENT,
      recipients: { employeeIds: ["e1"] },
      title: "Bạn quên chấm giờ ra ngày 22/10",
      body: "Ngày 22/10 ca Hành chính chỉ có log lúc 08:02, thiếu giờ ra. Báo HR để bổ sung công.",
      link: "/user/attendance?month=2026-10",
      data: { workDate: "2026-10-22", status: "missing_checkout" }
    });
    expect(notifications.notify.mock.calls[1][0]).toMatchObject({ recipients: { employeeIds: ["e2"] }, title: "Bạn quên chấm giờ vào ngày 22/10", body: expect.stringContaining("log lúc 17:35") });
    expect(prisma.attendanceReminderRun.update.mock.calls[0][0]).toMatchObject({ where: { workDate: "2026-10-22" }, data: { notified: 2, error: null } });
  });

  it("does nothing when the day was already claimed or reminders are off", async () => {
    const claimed = setup({ claimed: true });
    await expect(claimed.service.tick(AFTER)).resolves.toBeNull();
    expect(claimed.notifications.notify).not.toHaveBeenCalled();

    const off = setup({ enabled: false });
    await expect(off.service.tick(AFTER)).resolves.toBeNull();
    expect(off.prisma.attendanceReminderRun.create).not.toHaveBeenCalled();
  });

  it("skips a locked month", async () => {
    const { service, prisma, notifications } = setup({ locked: true });
    await expect(service.tick(AFTER)).resolves.toMatchObject({ notified: 0, skipped: "locked" });
    expect(prisma.attendanceDay.findMany).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it("lets HR send again for a past date, never for today", async () => {
    const { service, prisma } = setup();
    await expect(service.runNow(user, "2026-10-20")).resolves.toEqual({ workDate: "2026-10-20", notified: 2 });
    expect(prisma.attendanceReminderRun.upsert.mock.calls[0][0]).toMatchObject({ where: { workDate: "2026-10-20" }, create: { trigger: "manual", triggeredById: "emp-hr" } });
    await expect(service.runNow(user, "2999-01-01")).rejects.toBeInstanceOf(BadRequestException);
  });
});
