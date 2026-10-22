import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ShiftAssignmentsService } from "./shift-assignments.service";

// jose is ESM-only; the permission constants pull the auth guards (and AuthService) into the graph.
jest.mock("jose", () => ({}));

const user: AuthenticatedUser = {
  sub: "kc-1",
  roles: [],
  claims: {},
  account: { id: "acc-1", email: "hr@helios.test", displayName: "HR", employeeId: "emp-hr", adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
};
const day = (date: string) => new Date(`${date}T00:00:00.000Z`);
const vnMidnight = (date: string) => new Date(`${date}T00:00:00+07:00`);

function setup(options: { existing?: Array<{ employeeId: string; date: string; shiftId: string | null }>; activeShifts?: number; pattern?: unknown } = {}) {
  const prisma = {
    attendancePolicy: { findUnique: jest.fn().mockResolvedValue({ timezone: "Asia/Ho_Chi_Minh" }) },
    employee: {
      findMany: jest.fn().mockResolvedValue([
        { id: "e1", startDate: vnMidnight("2020-01-01"), endDate: null },
        { id: "e2", startDate: vnMidnight("2026-11-04"), endDate: null }
      ]),
      count: jest.fn().mockResolvedValue(1)
    },
    shift: { count: jest.fn().mockResolvedValue(options.activeShifts ?? 1) },
    shiftPattern: {
      findUnique: jest.fn().mockResolvedValue(
        options.pattern === undefined ? { id: "p1", status: "active", days: ["hc", null] } : options.pattern
      )
    },
    shiftAssignment: {
      findMany: jest.fn().mockResolvedValue((options.existing ?? []).map((row) => ({ ...row, date: day(row.date) }))),
      deleteMany: jest.fn((args) => ({ deleteMany: args })),
      createMany: jest.fn((args) => ({ createMany: args }))
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(async (operations: unknown[]) => operations)
  };
  const dataScope = {
    resolve: jest.fn().mockResolvedValue({ level: "company" }),
    employeeWhere: jest.fn().mockReturnValue({})
  };
  const recalc = { scheduleChanged: jest.fn(), holidaysChanged: jest.fn(), rulesChanged: jest.fn() };
  const service = new ShiftAssignmentsService(prisma as never, dataScope as never, { contextFields: () => ({}) } as never, recalc as never);
  return { service, prisma, recalc };
}

const base = { departmentIds: ["d-sales"], from: "2026-11-02", to: "2026-11-08" };

describe("ShiftAssignmentsService.bulk (AT-08)", () => {
  it("previews without writing", async () => {
    const { service, prisma } = setup({ existing: [{ employeeId: "e1", date: "2026-11-02", shiftId: "night" }, { employeeId: "e1", date: "2026-11-03", shiftId: "hc" }] });

    const result = await service.bulk(user, { ...base, mode: "shift", shiftId: "hc", weekdays: [1, 2, 3, 4, 5], preview: true });

    // e1: Mon–Fri (5), e2 starts Wednesday 4/11 (3).
    expect(result).toEqual({ cells: 8, create: 6, overwrite: 1, unchanged: 1, employees: 2, written: 7, saved: false });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("replaces changed cells and creates new ones, leaving unchanged ones", async () => {
    const { service, prisma, recalc } = setup({ existing: [{ employeeId: "e1", date: "2026-11-02", shiftId: "night" }, { employeeId: "e1", date: "2026-11-03", shiftId: "hc" }] });

    await expect(service.bulk(user, { ...base, mode: "shift", shiftId: "hc", weekdays: [1, 2, 3, 4, 5] })).resolves.toMatchObject({ written: 7, saved: true });

    expect(prisma.shiftAssignment.deleteMany).toHaveBeenCalledWith({ where: { OR: [{ employeeId: "e1", date: { in: [day("2026-11-02")] } }] } });
    const rows = prisma.shiftAssignment.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(7);
    expect(rows).toContainEqual({ employeeId: "e1", date: day("2026-11-02"), shiftId: "hc", note: null, createdById: "emp-hr" });
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "shift_assignment.bulk", afterValue: { overwriteExisting: true, written: 7 } });
    const [people, dates] = recalc.scheduleChanged.mock.calls[0];
    expect(people.sort()).toEqual(["e1", "e2"]);
    // 3/11 was already HC: not written, not recalculated.
    expect([...dates].sort()).toEqual(["2026-11-02", "2026-11-04", "2026-11-05", "2026-11-06"]);
  });

  it("keeps existing assignments when overwrite is off", async () => {
    const { service, prisma } = setup({ existing: [{ employeeId: "e1", date: "2026-11-02", shiftId: "night" }] });

    await expect(service.bulk(user, { ...base, mode: "shift", shiftId: null, overwrite: false })).resolves.toMatchObject({ create: 11, overwrite: 1, written: 11 });
    expect(prisma.shiftAssignment.deleteMany).not.toHaveBeenCalled();
  });

  it("applies a pattern from the first date", async () => {
    const { service, prisma } = setup();

    await service.bulk(user, { employeeIds: ["e1"], from: "2026-11-02", to: "2026-11-05", mode: "pattern", patternId: "p1" });

    const rows = prisma.shiftAssignment.createMany.mock.calls[0][0].data.filter((row: { employeeId: string }) => row.employeeId === "e1");
    expect(rows.map((row: { shiftId: string | null }) => row.shiftId)).toEqual(["hc", null, "hc", null]);
  });

  it("refuses an unknown pattern, an archived shift, an empty target and a range over a year", async () => {
    await expect(setup({ pattern: null }).service.bulk(user, { ...base, mode: "pattern", patternId: "nope" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup({ activeShifts: 0 }).service.bulk(user, { ...base, mode: "shift", shiftId: "old" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup().service.bulk(user, { from: "2026-11-02", to: "2026-11-08", mode: "shift", shiftId: "hc" })).rejects.toThrow("Chọn ít nhất");
    await expect(setup().service.bulk(user, { ...base, to: "2027-12-31", mode: "shift", shiftId: "hc" })).rejects.toThrow("tối đa 366 ngày");
  });
});
