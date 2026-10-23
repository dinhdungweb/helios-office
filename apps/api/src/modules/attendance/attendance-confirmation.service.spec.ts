import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceConfirmationService } from "./attendance-confirmation.service";

const user = (employeeId: string | null = "emp-1"): AuthenticatedUser => ({
  sub: "kc-1",
  roles: [],
  claims: {},
  account: { id: "acc-1", email: "a@helios.test", displayName: "A", employeeId, adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
});

function setup(options: { period?: Record<string, unknown> | null; existing?: Record<string, unknown> | null; requireConfirmation?: boolean; people?: number; confirmed?: number } = {}) {
  const prisma = {
    attendancePeriod: {
      findUnique: jest.fn().mockResolvedValue(options.period === undefined ? { month: "2026-10", status: "open", confirmationOpenedAt: new Date() } : options.period),
      upsert: jest.fn()
    },
    attendanceConfirmation: {
      findUnique: jest.fn().mockResolvedValue(options.existing ?? null),
      upsert: jest.fn(async (args) => ({ id: "c1", ...args.create })),
      update: jest.fn(async (args) => ({ id: "c1", ...options.existing, ...args.data })),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([{ status: "confirmed", _count: { _all: options.confirmed ?? 0 } }])
    },
    attendanceDay: {
      findMany: jest.fn().mockResolvedValue([
        { workUnits: new Prisma.Decimal("0.98"), paidLeaveUnits: new Prisma.Decimal(0), workedMinutes: 468, lateMinutes: 12, earlyMinutes: 0, status: "late" },
        { workUnits: new Prisma.Decimal(0), paidLeaveUnits: new Prisma.Decimal(0), workedMinutes: 0, lateMinutes: 0, earlyMinutes: 0, status: "missing_checkout" }
      ])
    },
    employee: { count: jest.fn().mockResolvedValue(options.people ?? 1), findMany: jest.fn().mockResolvedValue([]) },
    userAccount: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn() }
  };
  const dataScope = {
    resolve: jest.fn().mockResolvedValue({ level: "company" }),
    employeeWhere: jest.fn().mockReturnValue({})
  };
  const calculation = {
    timezone: jest.fn().mockResolvedValue("Asia/Ho_Chi_Minh"),
    getPolicy: jest.fn().mockResolvedValue({ requireTimesheetConfirmation: options.requireConfirmation ?? false })
  };
  const service = new AttendanceConfirmationService(prisma as never, dataScope as never, calculation as never, { contextFields: () => ({}) } as never);
  return { service, prisma };
}

describe("AttendanceConfirmationService (AT-24)", () => {
  it("shows my month: totals, whether I can answer, my answer", async () => {
    const result = await setup().service.myMonth(user(), "2026-10");

    expect(result).toMatchObject({
      month: "2026-10",
      locked: false,
      confirmationOpen: true,
      confirmation: null,
      totals: { workUnits: 0.98, workedHours: 7.8, lateCount: 1, lateMinutes: 12, missingPunchCount: 1 }
    });
  });

  it("records a confirmation, and feedback only with a message", async () => {
    const { service, prisma } = setup();

    await expect(service.answer(user(), "2026-10", "confirm")).resolves.toMatchObject({ status: "confirmed", feedback: null });
    expect(prisma.attendanceConfirmation.upsert.mock.calls[0][0].where).toEqual({ employeeId_month: { employeeId: "emp-1", month: "2026-10" } });

    await expect(service.answer(user(), "2026-10", "feedback", " ")).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.answer(user(), "2026-10", "feedback", "Ngày 16 tôi có đi làm, quên chấm ra")).resolves.toMatchObject({
      status: "feedback",
      feedback: "Ngày 16 tôi có đi làm, quên chấm ra"
    });
  });

  it("refuses answers before HR opens confirmation, after the month is locked, or without a profile", async () => {
    await expect(setup({ period: null }).service.answer(user(), "2026-10", "confirm")).rejects.toThrow("chưa mở xác nhận");
    await expect(setup({ period: { status: "locked", confirmationOpenedAt: new Date() } }).service.answer(user(), "2026-10", "confirm")).rejects.toThrow("đã chốt");
    await expect(setup().service.answer(user(null), "2026-10", "confirm")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lets HR open and close confirmation, but not on a locked month", async () => {
    const { service, prisma } = setup({ period: null });
    await expect(service.setOpen(user("emp-hr"), "2026-10", true)).resolves.toEqual({ month: "2026-10", confirmationOpen: true });
    expect(prisma.attendancePeriod.upsert.mock.calls[0][0].create).toMatchObject({ month: "2026-10", confirmationOpenedById: "emp-hr" });

    await expect(setup({ period: { status: "locked" } }).service.setOpen(user("emp-hr"), "2026-10", true)).rejects.toBeInstanceOf(ConflictException);
  });

  it("records how HR handled feedback", async () => {
    const { service, prisma } = setup({ existing: { id: "c1", employeeId: "emp-1", status: "feedback", feedback: "Thiếu công ngày 16", respondedAt: new Date() } });

    await expect(service.resolve(user("emp-hr"), "2026-10", "emp-1", "Đã sửa công ngày 16")).resolves.toMatchObject({ resolution: "Đã sửa công ngày 16" });
    expect(prisma.attendanceConfirmation.update.mock.calls[0][0].data).toMatchObject({ resolvedById: "emp-hr", resolution: "Đã sửa công ngày 16" });

    await expect(setup({ existing: { status: "confirmed" } }).service.resolve(user("emp-hr"), "2026-10", "emp-1", "Không có gì")).rejects.toThrow("không có phản hồi");
  });

  it("counts answers and blocks locking when the policy requires everyone to confirm", async () => {
    const { service } = setup({ people: 4, confirmed: 3 });
    await expect(service.counts("2026-10", {})).resolves.toEqual({ people: 4, confirmed: 3, feedback: 0, pending: 1 });
    await expect(service.assertConfirmedForLock("2026-10")).resolves.toBeUndefined();

    await expect(setup({ people: 4, confirmed: 3, requireConfirmation: true }).service.assertConfirmedForLock("2026-10")).rejects.toThrow("Còn 1 người chưa xác nhận");
    await expect(setup({ people: 4, confirmed: 4, requireConfirmation: true }).service.assertConfirmedForLock("2026-10")).resolves.toBeUndefined();
  });
});
