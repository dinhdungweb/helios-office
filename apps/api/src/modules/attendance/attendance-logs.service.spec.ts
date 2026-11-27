import { BadRequestException, ConflictException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceLogsService } from "./attendance-logs.service";

const user: AuthenticatedUser = {
  sub: "kc-1",
  roles: [],
  claims: {},
  account: { id: "acc-hr", email: "hr@helios.test", displayName: "HR", employeeId: "emp-hr", adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
};

const error = (overrides: Record<string, unknown> = {}) => ({
  id: "err-1",
  deviceId: "VP-01",
  employeeCode: "9001",
  storeCode: null,
  punchTime: new Date("2026-10-20T01:05:00.000Z"),
  errorType: "EMPLOYEE_NOT_FOUND",
  errorMessage: "Mã nhân viên chưa tồn tại trên hệ thống",
  rawPayload: { verify_type: "finger" },
  resolvedAt: null,
  ...overrides
});

function setup(options: { stored?: unknown; owner?: unknown; employee?: unknown; open?: unknown[] } = {}) {
  const prisma = {
    attendanceSyncError: {
      findUnique: jest.fn().mockResolvedValue(options.stored === undefined ? error() : options.stored),
      findMany: jest.fn().mockResolvedValue(options.open ?? [error(), error({ id: "err-2", punchTime: new Date("2026-10-20T10:00:00.000Z") })]),
      update: jest.fn((args) => ({ update: args })),
      updateMany: jest.fn((args) => ({ updateMany: args }))
    },
    employee: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(options.employee === undefined ? { id: "e1", code: "HL-003", fullName: "Khang", attendanceCode: null } : options.employee)
        .mockResolvedValueOnce(options.owner ?? null),
      findMany: jest.fn().mockResolvedValue([{ id: "e1", code: "HL-003", fullName: "Khang", attendanceCode: null, department: { name: "Kỹ thuật" } }]),
      update: jest.fn((args) => ({ employeeUpdate: args }))
    },
    attendanceRawLog: { createMany: jest.fn((args) => ({ createMany: args })) },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(async () => [{}, { count: 2 }, { count: 2 }])
  };
  const dataScope = { resolve: jest.fn().mockResolvedValue({ level: "company" }), employeeWhere: jest.fn().mockReturnValue({}) };
  const calculation = { timezone: jest.fn().mockResolvedValue("Asia/Ho_Chi_Minh"), recalculateForPunches: jest.fn() };
  const service = new AttendanceLogsService(prisma as never, dataScope as never, calculation as never, { contextFields: () => ({}) } as never);
  return { service, prisma, calculation };
}

describe("AttendanceLogsService sync errors (AT-20)", () => {
  it("gives the unknown code to an employee, imports every refused punch with it and recalculates", async () => {
    const { service, prisma, calculation } = setup();

    await expect(service.resolve(user, "err-1", { action: "assign", employeeId: "e1" })).resolves.toEqual({ resolved: 2, imported: 2 });

    expect(prisma.employee.update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { attendanceCode: "9001" } });
    const created = prisma.attendanceRawLog.createMany.mock.calls[0][0];
    expect(created.skipDuplicates).toBe(true);
    expect(created.data).toEqual([
      expect.objectContaining({ deviceId: "VP-01", employeeId: "e1", employeeCode: "9001", verifyType: "finger" }),
      expect.objectContaining({ punchTime: new Date("2026-10-20T10:00:00.000Z") })
    ]);
    expect(prisma.attendanceSyncError.updateMany.mock.calls[0][0].data).toMatchObject({ resolution: "assigned", resolvedById: "emp-hr", resolutionNote: "Gán cho HL-003 — Khang" });
    expect(calculation.recalculateForPunches).toHaveBeenCalledWith(
      [
        { employeeId: "e1", punchTime: new Date("2026-10-20T01:05:00.000Z") },
        { employeeId: "e1", punchTime: new Date("2026-10-20T10:00:00.000Z") }
      ],
      "punch_sync"
    );
  });

  it("looks up working people in scope to give a code to", async () => {
    const { service, prisma } = setup();
    await expect(service.candidates(user, " khang ")).resolves.toEqual([{ id: "e1", code: "HL-003", fullName: "Khang", attendanceCode: null, department: "Kỹ thuật" }]);
    const where = prisma.employee.findMany.mock.calls[0][0].where;
    expect(where.AND[1]).toEqual({ status: { not: "resigned" } });
    expect(where.AND[2].OR[0]).toEqual({ fullName: { contains: "khang", mode: "insensitive" } });
  });

  it("refuses a code that belongs to someone else, or an employee with another code", async () => {
    await expect(setup({ owner: { id: "e9", fullName: "Người khác" } }).service.resolve(user, "err-1", { action: "assign", employeeId: "e1" })).rejects.toThrow(
      "đang thuộc Người khác"
    );
    await expect(
      setup({ employee: { id: "e1", code: "HL-003", fullName: "Khang", attendanceCode: "1234" } }).service.resolve(user, "err-1", { action: "assign", employeeId: "e1" })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("only assigns unknown-code errors; others are dismissed with a note", async () => {
    await expect(setup({ stored: error({ errorType: "INVALID_PUNCH_TIME" }) }).service.resolve(user, "err-1", { action: "assign", employeeId: "e1" })).rejects.toBeInstanceOf(
      BadRequestException
    );

    const { service, prisma } = setup({ stored: error({ errorType: "INACTIVE_EMPLOYEE" }) });
    await expect(service.resolve(user, "err-1", { action: "dismiss", note: "Nhân sự đã nghỉ" })).resolves.toEqual({ resolved: 1, imported: 0 });
    expect(prisma.attendanceSyncError.update.mock.calls[0][0].data).toMatchObject({ resolution: "dismissed", resolutionNote: "Nhân sự đã nghỉ" });

    await expect(setup({ stored: error({ resolvedAt: new Date() }) }).service.resolve(user, "err-1", { action: "dismiss" })).rejects.toThrow("đã được xử lý");
  });
});
