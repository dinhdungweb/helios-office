import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceTimesheetService } from "./attendance-timesheet.service";

const user: AuthenticatedUser = {
  sub: "kc-1",
  roles: [],
  claims: {},
  account: { id: "acc-hr", email: "hr@helios.test", displayName: "HR", employeeId: "emp-hr", adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
};
const day = (date: string) => new Date(`${date}T00:00:00.000Z`);
const result = (date: string, overrides: Record<string, unknown>) => ({
  id: `r-${date}`,
  employeeId: "e1",
  workDate: day(date),
  status: "on_time",
  checkIn: null,
  checkOut: null,
  workedMinutes: 480,
  workUnits: new Prisma.Decimal(1),
  paidLeaveUnits: new Prisma.Decimal(0),
  lateMinutes: 0,
  earlyMinutes: 0,
  outsideShiftMinutes: 0,
  nightMinutes: 0,
  flags: [],
  shift: { code: "HC", color: "#2563eb" },
  ...overrides
});

function setup() {
  const prisma = {
    employee: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([
        { id: "e1", code: "HL-003", fullName: "Khang", startDate: new Date("2020-01-01T00:00:00+07:00"), endDate: null, department: { id: "d1", name: "Bán hàng", defaultShiftId: null } },
        // Joined on 21/10: earlier days carry no shift and do not count towards the standard.
        { id: "e2", code: "HL-009", fullName: "Mới", startDate: new Date("2026-10-21T00:00:00+07:00"), endDate: null, department: { id: "d1", name: "Bán hàng", defaultShiftId: null } }
      ])
    },
    attendanceDay: {
      findMany: jest.fn().mockResolvedValue([
        result("2026-10-19", { status: "absent", workedMinutes: 0, workUnits: new Prisma.Decimal(0) }),
        result("2026-10-20", { status: "late", lateMinutes: 12, workedMinutes: 468, workUnits: new Prisma.Decimal("0.98"), flags: ["adjusted"] }),
        result("2026-10-21", { status: "early_leave", earlyMinutes: 30, workedMinutes: 450, workUnits: new Prisma.Decimal("0.94"), nightMinutes: 60 }),
        result("2026-10-16", { status: "missing_checkout", workedMinutes: 0, workUnits: new Prisma.Decimal(0), flags: ["needs_explanation"] })
      ])
    },
    shiftAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    holiday: { findMany: jest.fn().mockResolvedValue([{ date: day("2026-10-30"), name: "Nghỉ công ty", type: "company_off", paid: true }]) },
    shift: { findMany: jest.fn().mockResolvedValue([{ id: "hc", code: "HC", color: "#2563eb", type: "fixed", startMinute: 480, endMinute: 1020, breakStartMinute: 720, breakEndMinute: 780, requiredMinutes: null, workUnits: new Prisma.Decimal(1) }]) }
  };
  const dataScope = {
    resolve: jest.fn().mockResolvedValue({ level: "department", departmentIds: ["d1"], employeeIds: [] }),
    employeeWhere: jest.fn().mockReturnValue({ departmentId: { in: ["d1"] } })
  };
  const calculation = { getPolicy: jest.fn().mockResolvedValue({ timezone: "Asia/Ho_Chi_Minh", defaultShiftId: "hc", workWeekdays: [1, 2, 3, 4, 5] }) };
  const periods = { assertOpen: jest.fn(), assertRangeOpen: jest.fn(), view: jest.fn().mockResolvedValue({ month: "2026-10", status: "open" }) };
  return { service: new AttendanceTimesheetService(prisma as never, dataScope as never, calculation as never, periods as never), prisma };
}

describe("AttendanceTimesheetService (AT-16)", () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date("2026-10-22T10:00:00+07:00") }));
  afterEach(() => jest.useRealTimers());

  it("builds one row per person with a cell per day and month totals", async () => {
    const { service, prisma } = setup();

    const sheet = await service.monthly(user, { month: "2026-10", departmentId: "d1", page: 1, limit: 50 });

    expect(sheet).toMatchObject({ month: "2026-10", from: "2026-10-01", to: "2026-10-31", today: "2026-10-22", total: 2 });
    expect(sheet.dates).toHaveLength(31);
    expect(sheet.dates[29]).toEqual({ date: "2026-10-30", weekday: 5, holiday: { name: "Nghỉ công ty", type: "company_off" } });
    expect(prisma.employee.findMany.mock.calls[0][0].where.AND[0]).toEqual({ departmentId: { in: ["d1"] } });

    const [khang, newcomer] = sheet.items;
    const cell = (date: string) => khang.cells.find((item) => item.date === date)!;
    expect(cell("2026-10-20")).toMatchObject({ id: "r-2026-10-20", status: "late", workUnits: 0.98, lateMinutes: 12, adjusted: true });
    expect(cell("2026-10-16")).toMatchObject({ status: "missing_checkout", needsExplanation: true });
    // A future working day shows the scheduled shift only.
    expect(cell("2026-10-27")).toMatchObject({ id: null, status: null, shiftCode: "HC" });
    expect(cell("2026-10-25")).toMatchObject({ status: null, shiftCode: null });

    expect(khang.totals).toEqual({
      lateCount: 1,
      lateMinutes: 12,
      earlyCount: 1,
      earlyMinutes: 30,
      missingPunchCount: 1,
      absentDays: 1,
      shiftUnits: 1.92,
      holidayUnits: 0,
      nightHours: 1,
      outsideHours: 0,
      // 22 working weekdays in October 2026, less the company day off on 30/10.
      standardUnits: 21,
      standardHours: 168,
      workedHours: 15.3,
      totalUnits: 1.92,
      workingDays: 4
    });
    expect(newcomer.cells.find((item) => item.date === "2026-10-20")!.shiftCode).toBeNull();
    expect(newcomer.totals.standardUnits).toBe(7);
  });

  it("rejects a malformed month", async () => {
    await expect(setup().service.monthly(user, { month: "2026-13" })).rejects.toThrow("Tháng phải có dạng");
  });
});
