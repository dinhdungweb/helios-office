import { BadRequestException, ConflictException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendancePeriodService, monthBounds } from "./attendance-period.service";

const user: AuthenticatedUser = {
  sub: "kc-1",
  roles: [],
  claims: {},
  account: { id: "acc-hr", email: "hr@helios.test", displayName: "HR", employeeId: "emp-hr", adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
};

function setup(stored: Record<string, unknown> | null = null, lockedMonths: string[] = []) {
  const prisma = {
    attendancePeriod: {
      findUnique: jest.fn().mockResolvedValue(stored),
      findMany: jest.fn(async ({ where }) => lockedMonths.filter((month) => where.month.in.includes(month)).map((month) => ({ month }))),
      upsert: jest.fn((args) => ({ upsert: args })),
      update: jest.fn((args) => ({ update: args }))
    },
    payrollCycle: { updateMany: jest.fn((args) => ({ updateMany: args })) },
    employee: { findMany: jest.fn().mockResolvedValue([{ id: "emp-hr", fullName: "Chị HR" }]) },
    userAccount: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(async (operations: unknown[]) => operations)
  };
  return { service: new AttendancePeriodService(prisma as never, { contextFields: () => ({}) } as never), prisma };
}

describe("AttendancePeriodService (AT-17)", () => {
  it("knows the last day of a month", () => {
    expect(monthBounds("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthBounds("2026-10")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });

  it("locks a month, stamps the payroll cycles covering it and audits", async () => {
    const { service, prisma } = setup();

    await service.lock(user, "2026-10", " Đã đối chiếu ");

    expect(prisma.attendancePeriod.upsert.mock.calls[0][0]).toMatchObject({
      where: { month: "2026-10" },
      create: { month: "2026-10", status: "locked", lockedById: "emp-hr", note: "Đã đối chiếu" }
    });
    expect(prisma.payrollCycle.updateMany.mock.calls[0][0]).toEqual({
      where: { periodStart: { lte: new Date("2026-10-31T23:59:59.999Z") }, periodEnd: { gte: new Date("2026-10-01T00:00:00.000Z") } },
      data: { lockedAttendanceAt: expect.any(Date) }
    });
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "attendance_period.lock", entityType: "AttendancePeriod", entityId: "2026-10" });
  });

  it("refuses to lock twice, and to unlock without a reason or an unlocked month", async () => {
    await expect(setup({ status: "locked" }).service.lock(user, "2026-10")).rejects.toBeInstanceOf(ConflictException);
    await expect(setup({ status: "locked" }).service.unlock(user, "2026-10", " ")).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup({ status: "open" }).service.unlock(user, "2026-10", "Sửa nhầm công")).rejects.toBeInstanceOf(ConflictException);
    await expect(setup().service.lock(user, "2026-13")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("unlocks with a reason and clears the payroll stamp", async () => {
    const { service, prisma } = setup({ month: "2026-10", status: "locked", lockedById: "emp-hr" });

    await service.unlock(user, "2026-10", "Bổ sung công công tác");

    expect(prisma.attendancePeriod.update.mock.calls[0][0]).toMatchObject({
      where: { month: "2026-10" },
      data: { status: "open", unlockedById: "emp-hr", unlockReason: "Bổ sung công công tác" }
    });
    expect(prisma.payrollCycle.updateMany.mock.calls[0][0].data).toEqual({ lockedAttendanceAt: null });
  });

  it("names the locked months a change would touch", async () => {
    const { service } = setup(null, ["2026-09", "2026-10"]);

    await expect(service.assertOpen(["2026-10-20", "2026-11-02"])).rejects.toThrow("Kỳ công tháng 10/2026 đã chốt");
    await expect(service.assertOpen(["2026-11-02"])).resolves.toBeUndefined();
    await expect(service.assertRangeOpen("2026-08-15", "2026-09-02")).rejects.toThrow("tháng 9/2026");
  });

  it("shows an open month without a row, and who locked a locked one", async () => {
    await expect(setup().service.view("2026-11")).resolves.toMatchObject({ month: "2026-11", status: "open", lockedBy: null });
    await expect(setup({ month: "2026-10", status: "locked", lockedById: "emp-hr", lockedAt: new Date() }).service.view("2026-10")).resolves.toMatchObject({
      status: "locked",
      lockedBy: "Chị HR"
    });
  });
});
