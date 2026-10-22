import { AttendanceCalculationService } from "./attendance-calculation.service";

const day = (date: string) => new Date(`${date}T00:00:00.000Z`);

const policy = {
  id: "default",
  timezone: "Asia/Ho_Chi_Minh",
  workWeekdays: [1, 2, 3, 4, 5],
  defaultShiftId: "hc",
  lateGraceMinutes: 0,
  earlyGraceMinutes: 0,
  lateCountMode: "full",
  missingPunchMode: "pending",
  punchWindowBeforeMinutes: 240,
  punchWindowAfterMinutes: 240,
  roundingMinutes: 0,
  punchPairing: "first_last",
  overnightAttribution: "shift_start",
  workUnitMode: "actual",
  workUnitRoundingHundredths: 1,
  outsideShiftMode: "record",
  holidayPaid: true
};

const hc = {
  id: "hc",
  code: "HC",
  type: "fixed",
  startMinute: 480,
  endMinute: 1020,
  breakStartMinute: 720,
  breakEndMinute: 780,
  requiredMinutes: null,
  workUnits: 1,
  lateGraceMinutes: null,
  earlyGraceMinutes: null,
  lateCountMode: null,
  missingPunchMode: null,
  punchWindowBeforeMinutes: null,
  punchWindowAfterMinutes: null
};

function setup(options: { existing?: unknown[]; startDate?: string } = {}) {
  const prisma = {
    attendancePolicy: { findUnique: jest.fn().mockResolvedValue(policy) },
    employee: {
      findMany: jest.fn().mockResolvedValue([
        { id: "e1", startDate: new Date(`${options.startDate ?? "2020-01-01"}T00:00:00+07:00`), endDate: null, department: { defaultShiftId: null } }
      ])
    },
    shift: { findMany: jest.fn().mockResolvedValue([hc]) },
    holiday: { findMany: jest.fn().mockResolvedValue([]) },
    shiftAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    attendanceRawLog: {
      findMany: jest.fn().mockResolvedValue([
        { employeeId: "e1", punchTime: new Date("2026-10-21T08:12:00+07:00") },
        { employeeId: "e1", punchTime: new Date("2026-10-21T17:00:00+07:00") }
      ])
    },
    attendanceAdjustment: { findMany: jest.fn().mockResolvedValue([]) },
    attendanceDay: {
      findMany: jest.fn().mockResolvedValue(options.existing ?? []),
      upsert: jest.fn((args) => ({ upsert: args })),
      update: jest.fn((args) => ({ update: args })),
      delete: jest.fn((args) => ({ delete: args }))
    },
    $transaction: jest.fn(async (operations: unknown[]) => operations)
  };
  return { service: new AttendanceCalculationService(prisma as never), prisma };
}

describe("AttendanceCalculationService (AT-11)", () => {
  it("stores the engine result with the change source", async () => {
    const { service, prisma } = setup();

    const totals = await service.recalculate({ from: "2026-10-21", to: "2026-10-21", source: "punch_sync" });

    expect(totals).toEqual({ days: 1, changed: 1, removed: 0 });
    const args = prisma.attendanceDay.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ employeeId_workDate: { employeeId: "e1", workDate: day("2026-10-21") } });
    expect(args.create).toMatchObject({ lateMinutes: 12, workedMinutes: 468, status: "late", lastChangeSource: "punch_sync", punchCount: 2 });
    expect(Number(args.create.workUnits)).toBe(0.98);
    expect(args.create.policySnapshot).toMatchObject({ shiftCode: "HC", lateGraceMinutes: 0, timezone: "Asia/Ho_Chi_Minh" });
  });

  it("leaves an unchanged day alone so it keeps its last change source", async () => {
    const first = setup();
    await first.service.recalculate({ from: "2026-10-21", to: "2026-10-21", source: "punch_sync" });
    const stored = { id: "d1", employeeId: "e1", workDate: day("2026-10-21"), ...first.prisma.attendanceDay.upsert.mock.calls[0][0].create };
    // jsonb hands keys back in its own order.
    stored.policySnapshot = Object.fromEntries(Object.entries(stored.policySnapshot).reverse());

    const { service, prisma } = setup({ existing: [stored] });
    const totals = await service.recalculate({ from: "2026-10-21", to: "2026-10-21", source: "recalculation" });

    expect(totals).toEqual({ days: 1, changed: 0, removed: 0 });
    expect(prisma.attendanceDay.upsert).not.toHaveBeenCalled();
    expect(prisma.attendanceDay.update).not.toHaveBeenCalled();
  });

  it("refreshes only the snapshot when new rules leave the figures as they were", async () => {
    const first = setup();
    await first.service.recalculate({ from: "2026-10-21", to: "2026-10-21", source: "punch_sync" });
    const stored = { id: "d1", employeeId: "e1", workDate: day("2026-10-21"), ...first.prisma.attendanceDay.upsert.mock.calls[0][0].create };
    // Recorded under an earlier rule set that produced the same figures.
    stored.policySnapshot = { ...stored.policySnapshot, earlyGraceMinutes: 3 };

    const { service, prisma } = setup({ existing: [stored] });
    const totals = await service.recalculate({ from: "2026-10-21", to: "2026-10-21", source: "recalculation" });

    expect(totals.changed).toBe(0);
    expect(prisma.attendanceDay.upsert).not.toHaveBeenCalled();
    expect(prisma.attendanceDay.update).toHaveBeenCalledWith({ where: { id: "d1" }, data: { policySnapshot: expect.objectContaining({ earlyGraceMinutes: 0 }) } });
  });

  it("removes days before the employee started", async () => {
    const { service, prisma } = setup({
      startDate: "2026-10-22",
      existing: [{ id: "old", employeeId: "e1", workDate: day("2026-10-21") }]
    });

    const totals = await service.recalculate({ from: "2026-10-21", to: "2026-10-21", source: "recalculation" });

    expect(totals.removed).toBe(1);
    expect(prisma.attendanceDay.delete).toHaveBeenCalledWith({ where: { id: "old" } });
  });

  it("recalculates the punch dates and the day before them", async () => {
    const { service } = setup();
    const recalculate = jest.spyOn(service, "recalculate").mockResolvedValue({ days: 0, changed: 0, removed: 0 });

    // 00:30 on the 22nd in Vietnam is still the 21st in UTC.
    await service.recalculateForPunches([
      { employeeId: "e1", punchTime: new Date("2026-10-22T00:30:00+07:00") },
      { employeeId: "e2", punchTime: new Date("2026-10-20T08:00:00+07:00") }
    ]);

    expect(recalculate).toHaveBeenCalledWith({ from: "2026-10-19", to: "2026-10-22", employeeIds: ["e1", "e2"], source: "punch_sync" });
  });
});
