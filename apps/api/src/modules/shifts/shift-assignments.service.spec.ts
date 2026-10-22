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

function setup(options: { visibleEmployees?: number; shiftStatus?: string | null } = {}) {
  const prisma = {
    employee: {
      findMany: jest.fn().mockResolvedValue([
        { id: "e1", code: "HL-001", fullName: "An", department: { id: "d-sales", name: "Kinh doanh", defaultShiftId: null } },
        { id: "e2", code: "HL-002", fullName: "Bình", department: { id: "d-ops", name: "Vận hành", defaultShiftId: "night" } }
      ]),
      count: jest.fn().mockResolvedValue(options.visibleEmployees ?? 2)
    },
    shiftAssignment: {
      findMany: jest.fn().mockResolvedValue([{ id: "a1", employeeId: "e1", date: day("2026-10-24"), shiftId: "hc", note: "Trực thứ 7" }]),
      upsert: jest.fn((args) => args),
      deleteMany: jest.fn().mockResolvedValue({ count: 2 })
    },
    holiday: { findMany: jest.fn().mockResolvedValue([]) },
    attendancePolicy: { findUnique: jest.fn().mockResolvedValue({ defaultShiftId: "hc", workWeekdays: [1, 2, 3, 4, 5] }) },
    shift: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(options.shiftStatus === null ? null : { status: options.shiftStatus ?? "active" })
    },
    department: { findUnique: jest.fn().mockResolvedValue({ id: "d-sales", defaultShiftId: null }), update: jest.fn(async ({ data }) => ({ id: "d-sales", name: "Kinh doanh", ...data })) },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(async (operations: unknown[]) => operations)
  };
  const dataScope = {
    resolve: jest.fn().mockResolvedValue({ level: "department", departmentIds: ["d-sales"], employeeIds: [] }),
    employeeWhere: jest.fn().mockReturnValue({ departmentId: { in: ["d-sales"] } }),
    departmentInScope: jest.fn((_scope, id: string) => id === "d-sales")
  };
  const recalc = { scheduleChanged: jest.fn(), holidaysChanged: jest.fn(), rulesChanged: jest.fn() };
  const service = new ShiftAssignmentsService(prisma as never, dataScope as never, { contextFields: () => ({}) } as never, recalc as never);
  return { service, prisma, dataScope, recalc };
}

describe("ShiftAssignmentsService (AT-07)", () => {
  it("builds the grid: assignment, department default, company default, weekend", async () => {
    const { service } = setup();

    const grid = await service.schedule(user, { from: "2026-10-23", to: "2026-10-24" });
    const [an, binh] = grid.employees;

    expect(an.days).toEqual([
      { date: "2026-10-23", shiftId: "hc", source: "company", assignmentId: null, note: null },
      { date: "2026-10-24", shiftId: "hc", source: "assignment", assignmentId: "a1", note: "Trực thứ 7" }
    ]);
    expect(binh.days.map((cell: { shiftId: string | null; source: string }) => [cell.shiftId, cell.source])).toEqual([
      ["night", "department"],
      [null, "none"]
    ]);
  });

  it("refuses a range that is backwards or too long", async () => {
    const { service } = setup();
    await expect(service.schedule(user, { from: "2026-10-24", to: "2026-10-23" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.schedule(user, { from: "2026-01-01", to: "2026-04-01" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("assigns every person × date, audits it and recalculates those days", async () => {
    const { service, prisma, recalc } = setup();

    await expect(service.assign(user, { employeeIds: ["e1", "e2"], dates: ["2026-10-24", "2026-10-25"], shiftId: "hc" })).resolves.toEqual({ assigned: 4 });

    expect(prisma.shiftAssignment.upsert).toHaveBeenCalledTimes(4);
    expect(prisma.shiftAssignment.upsert.mock.calls[0][0]).toMatchObject({
      where: { employeeId_date: { employeeId: "e1", date: day("2026-10-24") } },
      create: { shiftId: "hc", createdById: "emp-hr" }
    });
    const audit = prisma.auditLog.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({ action: "shift_assignment.assign", actorId: "emp-hr", afterValue: { shiftId: "hc", employeeIds: ["e1", "e2"] } });
    expect(audit.beforeValue).toBeUndefined();
    expect(recalc.scheduleChanged).toHaveBeenCalledWith(["e1", "e2"], ["2026-10-24", "2026-10-25"], "emp-hr");
  });

  it("refuses people outside the caller's scope, as if they did not exist", async () => {
    const { service, prisma } = setup({ visibleEmployees: 1 });

    await expect(service.assign(user, { employeeIds: ["e1", "e-other"], dates: ["2026-10-24"], shiftId: "hc" })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.shiftAssignment.upsert).not.toHaveBeenCalled();
  });

  it("only schedules active shifts, and allows a day off", async () => {
    await expect(setup({ shiftStatus: "archived", visibleEmployees: 1 }).service.assign(user, { employeeIds: ["e1"], dates: ["2026-10-24"], shiftId: "old" })).rejects.toBeInstanceOf(
      BadRequestException
    );
    await expect(setup({ visibleEmployees: 1 }).service.assign(user, { employeeIds: ["e1"], dates: ["2026-10-24"], shiftId: null })).resolves.toEqual({ assigned: 1 });
  });

  it("caps one request at 5000 cells", async () => {
    const employees = Array.from({ length: 100 }, (_, index) => `e${index}`);
    const dates = Array.from({ length: 51 }, (_, index) => `2026-10-${String((index % 28) + 1).padStart(2, "0")}`);
    await expect(setup().service.assign(user, { employeeIds: employees, dates, shiftId: "hc" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("sets a department default only inside the caller's scope", async () => {
    const { service, prisma } = setup();

    await expect(service.setDepartmentDefault(user, "d-sales", "night")).resolves.toMatchObject({ defaultShiftId: "night" });
    await expect(service.setDepartmentDefault(user, "d-ops", "night")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.department.update).toHaveBeenCalledTimes(1);
  });
});
