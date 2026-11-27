import type { Request } from "@prisma/client";
import { RequestTypeRegistry } from "../approvals/engine/request-types";
import { AbsenceRequestHandler } from "./absence-request.handler";
import { CheckinOutRequestHandler, nextDayCheckOut } from "./checkin-out-request.handler";
import { OvertimeRequestHandler } from "./overtime-request.handler";
import { ResignationRequestHandler } from "./resignation-request.handler";
import { ShiftChangeRequestHandler } from "./shift-change-request.handler";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loosely typed in-memory test double
type Row = Record<string, any>;

// Phase 3b task 9 (LV-17 → LV-21, AT-22). Dates in December 2026: 01 is a Tuesday, 05 a Saturday.
const TUE = "2026-12-01";
const SAT = "2026-12-05";
const PAST_TUE = "2026-11-24";

const iso = (value: Date) => value.toISOString().slice(0, 10);

function fakeDb() {
  const db = {
    shifts: [
      { id: "hc", code: "HC", name: "Hành chính", type: "fixed", status: "active", startMinute: 480, endMinute: 1020, breakStartMinute: 720, breakEndMinute: 780 },
      { id: "night", code: "CD", name: "Ca đêm", type: "fixed", status: "active", startMinute: 1320, endMinute: 360, breakStartMinute: null, breakEndMinute: null },
      { id: "old", code: "OLD", name: "Ca cũ", type: "fixed", status: "archived", startMinute: 360, endMinute: 840, breakStartMinute: null, breakEndMinute: null }
    ] as Row[],
    assignments: [] as Row[],
    holidays: [] as Row[],
    periods: [] as Row[],
    requests: [] as Row[],
    adjustments: [] as Row[],
    days: [] as Row[],
    employees: [{ id: "staff", startDate: new Date("2023-01-02T00:00:00Z"), endDate: null as Date | null, department: { defaultShiftId: null } }] as Row[]
  };
  const pick = (row: Row | undefined, select?: Row) => (row && select ? Object.fromEntries(Object.keys(select).map((key) => [key, row[key]])) : row ?? null);
  const findAssignment = (where: Row) => db.assignments.find((row) => row.employeeId === where.employeeId_date.employeeId && iso(row.date) === iso(where.employeeId_date.date));
  const client: Row = {
    attendancePolicy: { findUnique: async () => ({ timezone: "Asia/Ho_Chi_Minh", workWeekdays: [1, 2, 3, 4, 5], defaultShiftId: "hc" }) },
    employee: {
      findUnique: async ({ where }: Row) => db.employees.find((row) => row.id === where.id) ?? null,
      findUniqueOrThrow: async ({ where }: Row) => db.employees.find((row) => row.id === where.id)!,
      update: async ({ where, data }: Row) => Object.assign(db.employees.find((row) => row.id === where.id)!, data)
    },
    shiftAssignment: {
      findUnique: async ({ where, select }: Row) => pick(findAssignment(where), select),
      upsert: async ({ where, create, update }: Row) => {
        const existing = findAssignment(where);
        if (existing) return Object.assign(existing, update);
        db.assignments.push({ ...create });
        return create;
      },
      update: async ({ where, data }: Row) => Object.assign(findAssignment(where)!, data),
      delete: async ({ where }: Row) => {
        db.assignments.splice(db.assignments.indexOf(findAssignment(where)!), 1);
      }
    },
    holiday: { findFirst: async ({ where }: Row) => db.holidays.find((row) => iso(row.date) === iso(where.date)) ?? null },
    shift: {
      findUnique: async ({ where }: Row) => db.shifts.find((row) => row.id === where.id) ?? null,
      findFirst: async ({ where }: Row) => db.shifts.find((row) => row.id === where.id && row.status === where.status) ?? null
    },
    request: {
      findMany: async ({ where }: Row) => db.requests.filter((row) => row.type === where.type && where.status.in.includes(row.status) && row.id !== where.id?.not),
      update: async ({ where, data }: Row) => Object.assign(db.requests.find((row) => row.id === where.id) ?? {}, data)
    },
    attendancePeriod: { findMany: async ({ where }: Row) => db.periods.filter((row) => where.month.in.includes(row.month) && row.status === "locked") },
    attendanceDay: { findUnique: async () => db.days[0] ?? null },
    attendanceAdjustment: {
      create: async ({ data }: Row) => db.adjustments.push({ revokedAt: null, ...data }),
      createMany: async ({ data }: Row) => data.forEach((row: Row) => db.adjustments.push({ revokedAt: null, ...row })),
      findFirst: async ({ where }: Row) => db.adjustments.find((row) => row.sourceRequestId === where.sourceRequestId && row.type === where.type && row.revokedAt === null) ?? null,
      updateMany: async ({ where, data }: Row) => {
        const rows = db.adjustments.filter((row) => row.sourceRequestId === where.sourceRequestId && row.revokedAt === null);
        rows.forEach((row) => Object.assign(row, data));
        return { count: rows.length };
      }
    }
  };
  return { client, db };
}

function setup() {
  const { client, db } = fakeDb();
  const registry = new RequestTypeRegistry();
  const recalc = { request: jest.fn() };
  const deferred: Array<{ label: string; run: () => Promise<unknown> }> = [];
  const context = { tx: client as never, requesterId: "staff", actorId: "hr", defer: (label: string, run: () => Promise<unknown>) => deferred.push({ label, run }) };
  const handlers = {
    absence: new AbsenceRequestHandler(registry, recalc as never),
    overtime: new OvertimeRequestHandler(registry, recalc as never),
    checkinOut: new CheckinOutRequestHandler(registry, recalc as never),
    shiftChange: new ShiftChangeRequestHandler(registry, recalc as never),
    resignation: new ResignationRequestHandler(registry)
  };
  const asRequest = (type: string, payload: unknown, overrides: Row = {}) => ({ id: `req-${type}`, code: "XX-2026-000001", type, requesterId: "staff", status: "pending", payload, ...overrides }) as Request;
  const runDeferred = async () => {
    for (const item of deferred.splice(0)) await item.run();
  };
  return { db, context, handlers, recalc, asRequest, runDeferred };
}

const rejects = (promise: Promise<unknown>, text: string) => expect(promise).rejects.toThrow(text);

describe("AbsenceRequestHandler (LV-17)", () => {
  it("summarises the hours out and the kind", async () => {
    const { handlers, context } = setup();
    const { payload, summary } = await handlers.absence.prepare({ kind: "company", ranges: [{ date: TUE, fromTime: "14:00", toTime: "16:30" }], reason: "Gặp khách" }, context);
    expect(payload).toMatchObject({ kind: "company", ranges: [{ date: TUE, minutes: 150 }], reason: "Gặp khách" });
    expect(summary).toMatchObject({ quantity: 2.5, unit: "hour", subType: "company" });
    expect(summary.title).toContain("việc công ty");
  });

  it("refuses an end before the start, overlapping windows and days without a shift", async () => {
    const { handlers, context } = setup();
    await rejects(handlers.absence.prepare({ kind: "personal", ranges: [{ date: TUE, fromTime: "16:00", toTime: "14:00" }] }, context), "giờ kết thúc phải sau giờ bắt đầu");
    await rejects(
      handlers.absence.prepare({ kind: "personal", ranges: [{ date: TUE, fromTime: "09:00", toTime: "11:00" }, { date: TUE, fromTime: "10:00", toTime: "12:00" }] }, context),
      "bị trùng giờ"
    );
    await rejects(handlers.absence.prepare({ kind: "personal", ranges: [{ date: SAT, fromTime: "09:00", toTime: "10:00" }] }, context), "không có ca làm việc");
  });

  it("refuses time already on another absence request and days of a locked period", async () => {
    const { handlers, context, db } = setup();
    db.requests.push({ id: "other", code: "VM-2026-000009", type: "absence", status: "approved", payload: { kind: "personal", ranges: [{ date: TUE, fromTime: "09:00", toTime: "10:00", minutes: 60 }] } });
    await rejects(handlers.absence.prepare({ kind: "personal", ranges: [{ date: TUE, fromTime: "09:30", toTime: "11:00" }] }, context), "VM-2026-000009");
    await expect(handlers.absence.prepare({ kind: "personal", ranges: [{ date: TUE, fromTime: "10:00", toTime: "11:00" }] }, context)).resolves.toBeDefined();
    db.periods.push({ month: "2026-12", status: "locked" });
    await rejects(handlers.absence.prepare({ kind: "personal", ranges: [{ date: TUE, fromTime: "14:00", toTime: "15:00" }] }, context), "đã chốt");
  });

  it("writes one absence adjustment per window on approval and revokes them on cancel", async () => {
    const { handlers, context, db, recalc, asRequest, runDeferred } = setup();
    const { payload } = await handlers.absence.prepare({ kind: "company", ranges: [{ date: TUE, fromTime: "14:00", toTime: "16:00" }] }, context);
    const request = asRequest("absence", payload);
    await handlers.absence.onApproved(request, context);
    expect(db.adjustments).toEqual([
      expect.objectContaining({ type: "absence", paid: true, workDate: new Date(`${TUE}T00:00:00.000Z`), checkIn: new Date("2026-12-01T07:00:00.000Z"), checkOut: new Date("2026-12-01T09:00:00.000Z"), sourceRequestId: request.id })
    ]);
    await runDeferred();
    expect(recalc.request).toHaveBeenCalledWith(expect.objectContaining({ from: TUE, to: TUE, employeeIds: ["staff"], reason: "request" }));

    await handlers.absence.onCancelledAfterApproval(request, context);
    expect(db.adjustments[0].revokedAt).toBeInstanceOf(Date);
  });
});

describe("OvertimeRequestHandler (LV-18)", () => {
  it("takes the kind from the schedule: weekday, day off, holiday", async () => {
    const { handlers, context, db } = setup();
    expect((await handlers.overtime.prepare({ date: TUE, fromTime: "18:00", toTime: "21:00" }, context)).payload).toMatchObject({ kind: "weekday", minutes: 180, shiftCode: "HC", overnight: false });
    expect((await handlers.overtime.prepare({ date: SAT, fromTime: "08:00", toTime: "12:00" }, context)).payload).toMatchObject({ kind: "day_off", minutes: 240, shiftCode: null });
    db.holidays.push({ date: new Date(`${TUE}T00:00:00Z`), name: "Lễ", type: "holiday" });
    expect((await handlers.overtime.prepare({ date: TUE, fromTime: "08:00", toTime: "12:00" }, context)).payload).toMatchObject({ kind: "holiday" });
  });

  it("runs past midnight when the end is not after the start", async () => {
    const { handlers, context } = setup();
    const { payload, summary } = await handlers.overtime.prepare({ date: SAT, fromTime: "22:00", toTime: "02:00" }, context);
    expect(payload).toMatchObject({ overnight: true, minutes: 240 });
    expect(summary).toMatchObject({ quantity: 4, unit: "hour" });
  });

  it("refuses time inside the shift, too short, and overlapping another overtime request", async () => {
    const { handlers, context, db } = setup();
    await rejects(handlers.overtime.prepare({ date: TUE, fromTime: "16:00", toTime: "19:00" }, context), "trùng với ca HC");
    await rejects(handlers.overtime.prepare({ date: TUE, fromTime: "18:00", toTime: "18:10" }, context), "tối thiểu 15 phút");
    db.requests.push({ id: "ot", code: "LT-2026-000002", type: "overtime", status: "pending", payload: { date: TUE, fromTime: "18:00", toTime: "20:00" } });
    await rejects(handlers.overtime.prepare({ date: TUE, fromTime: "19:00", toTime: "21:00" }, context), "LT-2026-000002");
  });

  it("writes the approved window as an overtime adjustment", async () => {
    const { handlers, context, db, asRequest } = setup();
    const { payload } = await handlers.overtime.prepare({ date: SAT, fromTime: "22:00", toTime: "02:00" }, context);
    await handlers.overtime.onApproved(asRequest("overtime", payload), context);
    expect(db.adjustments[0]).toMatchObject({ type: "overtime", checkIn: new Date("2026-12-05T15:00:00.000Z"), checkOut: new Date("2026-12-05T19:00:00.000Z") });
  });
});

describe("CheckinOutRequestHandler (LV-20)", () => {
  it("needs a time and a reason, and no date still to come", async () => {
    const { handlers, context } = setup();
    await rejects(handlers.checkinOut.prepare({ date: PAST_TUE, reason: "Quên chấm" }, context), "giờ vào, giờ ra hoặc cả hai");
    await rejects(handlers.checkinOut.prepare({ date: "2099-01-06", checkOut: "17:00", reason: "Quên chấm" }, context), "ngày chưa tới");
  });

  it("allows one explanation per date", async () => {
    const { handlers, context, db } = setup();
    db.requests.push({ id: "gt", code: "GT-2026-000001", type: "checkin_out", status: "pending", payload: { date: PAST_TUE } });
    await rejects(handlers.checkinOut.prepare({ date: PAST_TUE, checkOut: "17:00", reason: "Quên chấm" }, context), "GT-2026-000001");
  });

  it("puts a night shift's check-out on the next day", () => {
    expect(nextDayCheckOut(null, "06:00", { startMinute: 1320, endMinute: 360 })).toBe(true);
    expect(nextDayCheckOut(null, "17:00", { startMinute: 480, endMinute: 1020 })).toBe(false);
    expect(nextDayCheckOut("22:00", "06:00", null)).toBe(true);
  });

  it("writes the explained times as an explanation adjustment", async () => {
    const { handlers, context, db, asRequest } = setup();
    db.days.push({ checkIn: new Date("2026-11-24T01:02:00Z"), checkOut: null, status: "missing_checkout" });
    const { payload, summary } = await handlers.checkinOut.prepare({ date: PAST_TUE, checkOut: "17:00", reason: "Quên chấm ra" }, context);
    expect(payload.recorded).toEqual({ checkIn: "2026-11-24T01:02:00.000Z", checkOut: null, status: "missing_checkout" });
    expect(summary.title).toBe("Giải trình giờ ra");
    await handlers.checkinOut.onApproved(asRequest("checkin_out", payload), context);
    expect(db.adjustments[0]).toMatchObject({ type: "explanation", checkIn: null, checkOut: new Date("2026-11-24T10:00:00.000Z") });
  });
});

describe("ShiftChangeRequestHandler (LV-19)", () => {
  it("records the shift worked now and refuses the same or an archived shift", async () => {
    const { handlers, context } = setup();
    expect((await handlers.shiftChange.prepare({ date: TUE, toShiftId: "night" }, context)).payload).toMatchObject({ fromShift: { code: "HC" }, toShift: { code: "CD" } });
    await rejects(handlers.shiftChange.prepare({ date: TUE, toShiftId: "hc" }, context), "đã làm ca HC");
    await rejects(handlers.shiftChange.prepare({ date: TUE, toShiftId: "old" }, context), "ngừng sử dụng");
  });

  it("changes the schedule on approval and removes the change on cancel", async () => {
    const { handlers, context, db, asRequest } = setup();
    const { payload } = await handlers.shiftChange.prepare({ date: TUE, toShiftId: "night" }, context);
    const request = asRequest("shift_change", payload);
    await handlers.shiftChange.onApproved(request, context);
    expect(db.assignments).toEqual([expect.objectContaining({ shiftId: "night", note: "Đổi ca theo đơn XX-2026-000001" })]);
    expect(db.adjustments[0]).toMatchObject({ type: "shift_swap", before: { assignment: null } });

    await handlers.shiftChange.onCancelledAfterApproval(request, context);
    expect(db.assignments).toEqual([]);
    expect(db.adjustments[0].revokedAt).toBeInstanceOf(Date);
  });

  it("puts back an assignment that was there before", async () => {
    const { handlers, context, db, asRequest } = setup();
    db.assignments.push({ employeeId: "staff", date: new Date(`${SAT}T00:00:00Z`), shiftId: "hc", note: "Trực cuối tuần" });
    const { payload } = await handlers.shiftChange.prepare({ date: SAT, toShiftId: "night" }, context);
    const request = asRequest("shift_change", payload);
    await handlers.shiftChange.onApproved(request, context);
    await handlers.shiftChange.onCancelledAfterApproval(request, context);
    expect(db.assignments).toEqual([expect.objectContaining({ shiftId: "hc", note: "Trực cuối tuần" })]);
  });
});

describe("ResignationRequestHandler (LV-21)", () => {
  it("refuses a last day already gone and a second resignation", async () => {
    const { handlers, context, db } = setup();
    await rejects(handlers.resignation.prepare({ lastWorkingDate: "2020-01-01", reason: "Chuyển việc" }, context), "trước hôm nay");
    db.requests.push({ id: "tv", code: "TV-2026-000001", type: "resignation", status: "pending", payload: {} });
    await rejects(handlers.resignation.prepare({ lastWorkingDate: "2099-01-15", reason: "Chuyển việc" }, context), "TV-2026-000001");
  });

  it("sets the end date on approval and restores it on cancel", async () => {
    const { handlers, context, db, asRequest } = setup();
    const { payload } = await handlers.resignation.prepare({ lastWorkingDate: "2099-01-15", reason: "Chuyển việc", handover: "Bàn giao cho Hải Anh" }, context);
    expect(payload.noticeDays).toBeGreaterThan(0);
    const request = asRequest("resignation", payload);
    db.requests.push(request as Row);
    await handlers.resignation.onApproved(request, context);
    expect(iso(db.employees[0].endDate!)).toBe("2099-01-15");
    expect((db.requests[0].payload as Row).previousEndDate).toBeNull();

    await handlers.resignation.onCancelledAfterApproval({ ...request, payload: db.requests[0].payload } as Request, context);
    expect(db.employees[0].endDate).toBeNull();
  });
});
