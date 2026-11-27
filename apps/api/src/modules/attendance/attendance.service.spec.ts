import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceService } from "./attendance.service";

const user = (employeeId: string | null = "emp-1"): AuthenticatedUser => ({
  sub: "kc-1",
  roles: [],
  claims: {},
  account: { id: "acc-1", email: "a@helios.test", displayName: "A", employeeId, adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
});

const storedDay = {
  id: "d1",
  employeeId: "emp-1",
  workDate: new Date("2026-10-19T00:00:00.000Z"),
  status: "late",
  lateMinutes: 10,
  workUnits: new Prisma.Decimal("0.98"),
  paidLeaveUnits: new Prisma.Decimal(0),
  policySnapshot: { lateGraceMinutes: 0 },
  employee: { id: "emp-1", code: "SRG-024", fullName: "A", department: { id: "d1", name: "HCNS" } },
  shift: { id: "hc", code: "HC", name: "Hành chính", color: null, startMinute: 480, endMinute: 1020 }
};

function setup() {
  const prisma = {
    attendanceDay: {
      findMany: jest.fn().mockResolvedValue([storedDay]),
      count: jest.fn().mockResolvedValue(41),
      groupBy: jest.fn().mockResolvedValue([
        { status: "on_time", _count: { _all: 30 } },
        { status: "late", _count: { _all: 4 } },
        { status: "late_and_early", _count: { _all: 1 } },
        { status: "missing_checkout", _count: { _all: 2 } },
        { status: "absent", _count: { _all: 3 } },
        { status: "day_off", _count: { _all: 12 } }
      ])
    },
    attendanceRawLog: { count: jest.fn().mockResolvedValue(120) },
    attendanceSyncError: { count: jest.fn().mockResolvedValue(2) },
    attendanceDevice: { count: jest.fn().mockResolvedValue(1) }
  };
  const calculation = { timezone: jest.fn().mockResolvedValue("Asia/Ho_Chi_Minh") };
  const dataScope = {
    resolve: jest.fn().mockResolvedValue({ level: "department", departmentIds: ["d1"], employeeIds: [] }),
    employeeWhere: jest.fn().mockReturnValue({ departmentId: { in: ["d1"] } })
  };
  const service = new AttendanceService(prisma as never, calculation as never, dataScope as never);
  return { service, prisma, dataScope };
}

describe("AttendanceService reads (AT-02, AT-03)", () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date("2026-10-22T10:00:00+07:00") }));
  afterEach(() => jest.useRealTimers());

  it("lists calculated days in the caller's scope, paginated, without the rule snapshot", async () => {
    const { service, prisma } = setup();

    const page = await service.findDays(user(), { departmentId: "d1", status: "late", page: 2, limit: 20 });

    const args = prisma.attendanceDay.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      workDate: { gte: new Date("2026-09-22T00:00:00.000Z"), lte: new Date("2026-10-22T00:00:00.000Z") },
      status: "late",
      employee: { AND: [{ departmentId: { in: ["d1"] } }, { departmentId: "d1" }, {}] }
    });
    expect(args).toMatchObject({ skip: 20, take: 20, orderBy: [{ workDate: "desc" }, { employee: { code: "asc" } }] });
    expect(page).toMatchObject({ total: 41, page: 2, limit: 20, pageCount: 3 });
    expect(page.items[0]).toMatchObject({ workDate: "2026-10-19", workUnits: 0.98, lateMinutes: 10, shift: { code: "HC" } });
    expect(page.items[0]).not.toHaveProperty("policySnapshot");
  });

  it("returns my days for the current month by default and limits the range", async () => {
    const { service, prisma } = setup();

    await service.findMyDays(user(), {});
    expect(prisma.attendanceDay.findMany.mock.calls[0][0].where).toEqual({
      employeeId: "emp-1",
      workDate: { gte: new Date("2026-10-01T00:00:00.000Z"), lte: new Date("2026-10-22T00:00:00.000Z") }
    });
    await expect(service.findMyDays(user(), { from: "2026-01-01", to: "2026-06-30" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.findMyDays(user(null), {})).resolves.toEqual([]);
  });

  it("summarises this month for the dashboards", async () => {
    const { service } = setup();

    await expect(service.getSummary(user())).resolves.toEqual({
      from: "2026-10-01",
      to: "2026-10-22",
      totalRecords: 40,
      validRecords: 30,
      recordsNeedReview: 2,
      late: 5,
      earlyLeave: 1,
      absent: 3,
      rawLogs: 120,
      syncErrors: 2,
      activeDevices: 1
    });
  });
});
