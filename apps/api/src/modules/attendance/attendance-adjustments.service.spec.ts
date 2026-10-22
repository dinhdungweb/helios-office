import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceAdjustmentsService } from "./attendance-adjustments.service";

const user: AuthenticatedUser = {
  sub: "kc-1",
  roles: [],
  claims: {},
  account: { id: "acc-hr", email: "hr@helios.test", displayName: "HR", employeeId: "emp-hr", adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
};

const workDate = new Date("2026-10-20T00:00:00.000Z");
const storedDay = {
  id: "day-1",
  employeeId: "emp-1",
  workDate,
  scheduledStart: new Date("2026-10-20T08:00:00+07:00"),
  scheduledEnd: new Date("2026-10-20T17:00:00+07:00"),
  checkIn: new Date("2026-10-20T08:12:00+07:00"),
  checkOut: new Date("2026-10-20T17:00:00+07:00"),
  workUnits: new Prisma.Decimal("0.98"),
  paidLeaveUnits: new Prisma.Decimal(0),
  status: "late",
  lateMinutes: 12,
  earlyMinutes: 0,
  workedMinutes: 468,
  policySnapshot: { lateGraceMinutes: 0 },
  employee: { id: "emp-1", code: "HL-003", fullName: "Khang", department: { id: "d1", name: "Bán hàng" } },
  shift: null
};

function setup(options: { day?: unknown; active?: unknown; revoked?: number } = {}) {
  const prisma = {
    attendanceDay: { findFirst: jest.fn().mockResolvedValue(options.day === undefined ? storedDay : options.day) },
    attendanceAdjustment: {
      findFirst: jest.fn().mockResolvedValue(options.active ?? null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn((args) => ({ id: "adj-new", ...args.data })),
      update: jest.fn((args) => ({ update: args })),
      updateMany: jest.fn().mockResolvedValue({ count: options.revoked ?? 1 })
    },
    attendanceRawLog: { findMany: jest.fn().mockResolvedValue([]) },
    employee: { findMany: jest.fn().mockResolvedValue([]) },
    userAccount: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(async (operations: unknown[]) => operations)
  };
  const dataScope = {
    resolve: jest.fn().mockResolvedValue({ level: "department", departmentIds: ["d1"], employeeIds: [] }),
    employeeWhere: jest.fn().mockReturnValue({ departmentId: { in: ["d1"] } })
  };
  const calculation = { timezone: jest.fn().mockResolvedValue("Asia/Ho_Chi_Minh"), recalculate: jest.fn().mockResolvedValue({ days: 1, changed: 1, removed: 0 }) };
  const service = new AttendanceAdjustmentsService(prisma as never, dataScope as never, calculation as never, { contextFields: () => ({}) } as never);
  return { service, prisma, calculation, dataScope };
}

describe("AttendanceAdjustmentsService (AT-15)", () => {
  it("records a change with its reason, reads times in the company time zone and recalculates the day", async () => {
    const { service, prisma, calculation } = setup();

    await service.adjust(user, "day-1", { checkIn: "2026-10-20T08:00", reason: "Máy chấm hỏng, quản lý xác nhận" });

    const data = prisma.attendanceAdjustment.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      employeeId: "emp-1",
      workDate,
      punchesSet: true,
      checkIn: new Date("2026-10-20T01:00:00.000Z"),
      // The check-out HR did not touch keeps the recorded one.
      checkOut: storedDay.checkOut,
      workUnits: null,
      status: null,
      reason: "Máy chấm hỏng, quản lý xác nhận",
      createdById: "emp-hr",
      before: expect.objectContaining({ status: "late", lateMinutes: 12, workUnits: 0.98 })
    });
    expect(calculation.recalculate).toHaveBeenCalledWith({ from: "2026-10-20", to: "2026-10-20", employeeIds: ["emp-1"], source: "manual" });
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "attendance.adjust", entityType: "AttendanceDay", entityId: "day-1", actorId: "emp-hr" });
  });

  it("merges with the active change and revokes it, so earlier edits are kept", async () => {
    const active = { id: "adj-old", punchesSet: true, checkIn: new Date("2026-10-20T01:00:00.000Z"), checkOut: null, workUnits: null, status: null };
    const { service, prisma } = setup({ active });

    await service.adjust(user, "day-1", { workUnits: 1, reason: "Đủ công theo xác nhận" });

    expect(prisma.attendanceAdjustment.create.mock.calls[0][0].data).toMatchObject({
      punchesSet: true,
      checkIn: active.checkIn,
      checkOut: null,
      workUnits: new Prisma.Decimal(1)
    });
    expect(prisma.attendanceAdjustment.update).toHaveBeenCalledWith({ where: { id: "adj-old" }, data: { revokedAt: expect.any(Date), revokedById: "emp-hr" } });
  });

  it("refuses a check-out before the check-in, an empty change and a day outside the caller's scope", async () => {
    await expect(setup().service.adjust(user, "day-1", { checkOut: "2026-10-20T07:00", reason: "Sửa giờ ra" })).rejects.toThrow("Giờ ra phải sau giờ vào");
    await expect(setup().service.adjust(user, "day-1", { reason: "Không đổi gì" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup({ day: null }).service.adjust(user, "day-x", { workUnits: 1, reason: "Ngoài phạm vi" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("allows a check-out past midnight", async () => {
    const { service, prisma } = setup();
    await service.adjust(user, "day-1", { checkOut: "2026-10-21T01:30", reason: "Làm tới khuya" });
    expect(prisma.attendanceAdjustment.create.mock.calls[0][0].data.checkOut).toEqual(new Date("2026-10-20T18:30:00.000Z"));
  });

  it("undoes manual changes and recalculates, or says there is nothing to undo", async () => {
    const { service, calculation, prisma } = setup();
    await service.revoke(user, "day-1", { reason: "Nhập nhầm" });
    expect(prisma.attendanceAdjustment.updateMany.mock.calls[0][0].where).toEqual({ employeeId: "emp-1", workDate, revokedAt: null });
    expect(calculation.recalculate).toHaveBeenCalled();

    await expect(setup({ revoked: 0 }).service.revoke(user, "day-1", {})).rejects.toThrow("không có sửa tay");
  });

  it("shows the day with its punches and the change history with names", async () => {
    const { service, prisma } = setup();
    prisma.attendanceAdjustment.findMany.mockResolvedValue([
      { id: "a2", type: "manual", punchesSet: false, checkIn: null, checkOut: null, workUnits: new Prisma.Decimal(1), status: null, reason: "Đủ công", before: {}, createdAt: new Date(), createdById: "emp-hr", revokedAt: null, revokedById: null }
    ]);
    prisma.employee.findMany.mockResolvedValue([{ id: "emp-hr", fullName: "Chị HR" }]);
    prisma.attendanceRawLog.findMany.mockResolvedValue([{ punchTime: storedDay.checkIn, deviceId: "VP", verifyType: "finger" }]);

    const detail = await service.detail(user, "day-1");

    expect(detail).toMatchObject({ workDate: "2026-10-20", workUnits: 0.98, rules: { lateGraceMinutes: 0 }, punches: [{ deviceId: "VP" }] });
    expect(detail.adjustments[0]).toMatchObject({ workUnits: 1, createdBy: "Chị HR", active: true, checkIn: undefined });
    expect(detail).not.toHaveProperty("policySnapshot");
  });
});
