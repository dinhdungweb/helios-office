import { calculateEmployeeDays, type CalcPolicy, type CalcShift, type EmployeeDaysInput } from "./employee-days";
import { parsePunchTime } from "../attendance.service";

const TZ = "Asia/Ho_Chi_Minh";
// Wall-clock time in Vietnam (UTC+7) as an instant.
const vn = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`);

const policy: CalcPolicy = {
  timezone: TZ,
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
  holidayPaid: true,
  lateEarlyUnit: "minute",
  overnightSplit: "none",
  continuousShiftMaxDays: 0
};

const shift = (id: string, startMinute: number, endMinute: number, extra: Partial<CalcShift> = {}): CalcShift => ({
  id,
  code: id.toUpperCase(),
  type: "fixed",
  startMinute,
  endMinute,
  breakStartMinute: null,
  breakEndMinute: null,
  requiredMinutes: null,
  workUnits: 1,
  lateGraceMinutes: null,
  earlyGraceMinutes: null,
  lateCountMode: null,
  missingPunchMode: null,
  punchWindowBeforeMinutes: null,
  punchWindowAfterMinutes: null,
  autoDetect: false,
  applyDepartmentIds: [],
  applyPositionIds: [],
  ...extra
});

const shifts = new Map([
  ["hc", shift("hc", 8 * 60, 17 * 60, { breakStartMinute: 12 * 60, breakEndMinute: 13 * 60 })],
  ["night", shift("night", 22 * 60, 6 * 60)]
]);

function run(overrides: Partial<EmployeeDaysInput>) {
  return calculateEmployeeDays({
    from: "2026-10-19",
    to: "2026-10-23",
    policy,
    shifts,
    holidays: new Map(),
    assignments: new Map(),
    departmentDefaultShiftId: null,
    employment: { startDate: "2020-01-01", endDate: null },
    punches: [],
    manual: new Map(),
    ...overrides
  });
}

const byDate = (days: ReturnType<typeof run>) => new Map(days.map((day) => [day.workDate, day]));

describe("calculateEmployeeDays (AT-11)", () => {
  it("counts a night shift past midnight once, on the day it starts", () => {
    const days = byDate(
      run({
        from: "2026-10-21",
        to: "2026-10-22",
        assignments: new Map([["2026-10-21", "night"], ["2026-10-22", null]]),
        punches: [vn("2026-10-21", "21:58"), vn("2026-10-22", "06:01")]
      })
    );

    const night = days.get("2026-10-21")!.result!;
    expect(night.status).toBe("on_time");
    expect(night.workUnits).toBe(1);
    expect(night.nightMinutes).toBe(480);
    expect(night.checkOut).toEqual(vn("2026-10-22", "06:01"));
    expect(days.get("2026-10-22")!.result!.status).toBe("day_off");
    expect(days.get("2026-10-22")!.punchCount).toBe(0);
  });

  it("splits punches between a night shift and the next morning's shift", () => {
    const days = byDate(
      run({
        from: "2026-10-20",
        to: "2026-10-21",
        assignments: new Map([["2026-10-20", "night"]]),
        punches: [vn("2026-10-20", "22:00"), vn("2026-10-21", "06:00"), vn("2026-10-21", "07:58"), vn("2026-10-21", "17:00")]
      })
    );

    expect(days.get("2026-10-20")!.result!.checkOut).toEqual(vn("2026-10-21", "06:00"));
    const morning = days.get("2026-10-21")!.result!;
    expect(morning.checkIn).toEqual(vn("2026-10-21", "07:58"));
    expect(morning.workUnits).toBe(1);
  });

  it("uses the company default shift on working days and records work on a weekend", () => {
    const days = byDate(
      run({
        from: "2026-10-23",
        to: "2026-10-24",
        punches: [vn("2026-10-23", "08:12"), vn("2026-10-23", "17:00"), vn("2026-10-24", "09:00"), vn("2026-10-24", "11:00")]
      })
    );

    const friday = days.get("2026-10-23")!;
    expect(friday.shiftCode).toBe("HC");
    expect(friday.result!.lateMinutes).toBe(12);
    expect(friday.result!.status).toBe("late");
    const saturday = days.get("2026-10-24")!.result!;
    expect(saturday.status).toBe("day_off");
    expect(saturday.flags).toContain("worked_on_day_off");
    expect(saturday.outsideShiftMinutes).toBe(120);
  });

  it("prefers the department's default shift and a make-up working day", () => {
    const days = byDate(
      run({
        from: "2026-10-24",
        to: "2026-10-24",
        departmentDefaultShiftId: "night",
        holidays: new Map([["2026-10-24", { type: "compensatory_workday" as const, paid: true }]])
      })
    );

    expect(days.get("2026-10-24")!.shiftCode).toBe("NIGHT");
    expect(days.get("2026-10-24")!.result!.status).toBe("absent");
  });

  it("returns no result outside employment and applies HR's adjustment last", () => {
    const days = byDate(
      run({
        from: "2026-10-19",
        to: "2026-10-20",
        employment: { startDate: "2026-10-20", endDate: null },
        manual: new Map([["2026-10-20", { workUnits: 0.5 }]])
      })
    );

    expect(days.get("2026-10-19")!.result).toBeNull();
    const adjusted = days.get("2026-10-20")!.result!;
    expect(adjusted.status).toBe("absent");
    expect(adjusted.workUnits).toBe(0.5);
    expect(adjusted.flags).toContain("adjusted");
  });

  it("treats an archived shift on the schedule as no shift", () => {
    const days = byDate(run({ from: "2026-10-19", to: "2026-10-19", assignments: new Map([["2026-10-19", "gone"]]) }));
    expect(days.get("2026-10-19")!.result!.status).toBe("day_off");
  });
});

describe("parsePunchTime", () => {
  it("reads a time without offset as company wall-clock time", () => {
    expect(parsePunchTime("2026-10-21 08:05:30", TZ)).toEqual(new Date("2026-10-21T01:05:30.000Z"));
    expect(parsePunchTime("2026-10-21T23:59:59.5", TZ)).toEqual(new Date("2026-10-21T16:59:59.500Z"));
  });

  it("keeps an explicit offset", () => {
    expect(parsePunchTime("2026-10-21 08:05:30Z", TZ)).toEqual(new Date("2026-10-21T08:05:30.000Z"));
    expect(parsePunchTime("2026-10-21 08:05:30+0700", TZ)).toEqual(new Date("2026-10-21T01:05:30.000Z"));
  });

  it("rejects impossible dates and other formats", () => {
    expect(parsePunchTime("2026-02-30 08:00:00", TZ)).toBeNull();
    expect(parsePunchTime("2026-10-21 24:00:00", TZ)).toBeNull();
    expect(parsePunchTime("21/10/2026 08:00", TZ)).toBeNull();
  });
});

describe("calculateEmployeeDays with 1Office general settings (AT-28)", () => {
  const at = (date: string, time: string) => new Date(`${date}T${time}+07:00`);

  it("counts lateness by the minute unless seconds are asked for", () => {
    const punches = [at("2026-10-21", "08:00:59"), at("2026-10-21", "16:59:30")];
    const byMinute = byDate(run({ from: "2026-10-21", to: "2026-10-21", punches })).get("2026-10-21")!.result!;
    expect([byMinute.lateMinutes, byMinute.earlyMinutes, byMinute.status]).toEqual([0, 1, "early_leave"]);

    const bySecond = byDate(run({ from: "2026-10-21", to: "2026-10-21", punches, policy: { ...policy, lateEarlyUnit: "second" } })).get("2026-10-21")!.result!;
    expect([bySecond.lateMinutes, bySecond.status]).toEqual([1, "late_and_early"]);
  });

  it("shares a night shift's hours with the next day when splitting at midnight", () => {
    const base = { from: "2026-10-21", to: "2026-10-22", assignments: new Map([["2026-10-21", "night"], ["2026-10-22", null]]) };
    // Worked 23:00–06:00: 1 h before midnight, 6 h after.
    const punches = [vn("2026-10-21", "23:00"), vn("2026-10-22", "06:00")];

    const split = byDate(run({ ...base, punches, policy: { ...policy, overnightSplit: "split" } }));
    const first = split.get("2026-10-21")!.result!;
    const second = split.get("2026-10-22")!.result!;
    expect([first.workedMinutes, second.workedMinutes]).toEqual([60, 360]);
    expect(first.workUnits + second.workUnits).toBeCloseTo(0.88, 2);
    expect(first.lateMinutes).toBe(60);
    expect(first.flags).toContain("split_to_next");
    expect(second.flags).toContain("split_from_previous");
    expect(second.status).toBe("day_off");

    // By the shift's own hours: 2 h of 8 before midnight, whatever was worked.
    const full = byDate(run({ ...base, punches, policy: { ...policy, overnightSplit: "split_full" } }));
    expect([full.get("2026-10-21")!.result!.workedMinutes, full.get("2026-10-22")!.result!.workedMinutes]).toEqual([105, 315]);

    // Off: everything stays on the shift's day.
    const off = byDate(run({ ...base, punches }));
    expect([off.get("2026-10-21")!.result!.workedMinutes, off.get("2026-10-22")!.result!.workedMinutes]).toEqual([420, 0]);
  });

  it("counts a run of shift days in full with a check-in on the first and a check-out on the last", () => {
    // Mon in 08:00, Tue nothing, Wed out 17:00.
    const punches = [vn("2026-10-19", "08:00"), vn("2026-10-21", "17:00")];
    const joined = byDate(run({ from: "2026-10-19", to: "2026-10-21", punches, policy: { ...policy, continuousShiftMaxDays: 3 } }));
    for (const date of ["2026-10-19", "2026-10-20", "2026-10-21"]) {
      const day = joined.get(date)!.result!;
      expect([date, day.status, day.workUnits]).toEqual([date, "on_time", 1]);
      expect(day.flags).toContain("continuous_shift");
    }

    // Longer than allowed: left as forgotten punches.
    const tooLong = byDate(run({ from: "2026-10-19", to: "2026-10-21", punches, policy: { ...policy, continuousShiftMaxDays: 2 } }));
    expect(["2026-10-19", "2026-10-20", "2026-10-21"].map((date) => tooLong.get(date)!.result!.status)).toEqual(["missing_checkout", "absent", "missing_checkin"]);

    // A day HR changed by hand breaks the run.
    const manual = new Map([["2026-10-20", { workUnits: 0.5 }]]);
    const broken = byDate(run({ from: "2026-10-19", to: "2026-10-21", punches, manual, policy: { ...policy, continuousShiftMaxDays: 3 } }));
    expect(broken.get("2026-10-19")!.result!.status).toBe("missing_checkout");
  });

  it("sees a run that starts before the requested range", () => {
    const punches = [vn("2026-10-19", "08:00"), vn("2026-10-20", "17:00")];
    const days = byDate(run({ from: "2026-10-20", to: "2026-10-20", punches, policy: { ...policy, continuousShiftMaxDays: 2 } }));
    expect(days.size).toBe(1);
    expect(days.get("2026-10-20")!.result!.status).toBe("on_time");
  });
});

describe("calculateEmployeeDays detecting shifts from punches (AT-29)", () => {
  // Two shop shifts the punches may pick on days without an assignment.
  const detected = new Map([
    ...shifts,
    ["morning", shift("morning", 6 * 60, 14 * 60, { autoDetect: true, applyDepartmentIds: ["shop"] })],
    ["evening", shift("evening", 14 * 60, 22 * 60, { autoDetect: true, applyDepartmentIds: ["shop"] })]
  ]);
  const shop = { shifts: detected, departmentId: "shop", positionId: null };

  it("takes the shift whose hours fit the punches, instead of the default", () => {
    const days = byDate(run({ ...shop, from: "2026-10-21", to: "2026-10-22", punches: [vn("2026-10-21", "13:55"), vn("2026-10-21", "22:02"), vn("2026-10-22", "05:58"), vn("2026-10-22", "14:01")] }));
    const evening = days.get("2026-10-21")!;
    expect([evening.shiftCode, evening.result!.status, evening.result!.workUnits]).toEqual(["EVENING", "on_time", 1]);
    expect(evening.result!.flags).toContain("auto_shift");
    expect(days.get("2026-10-22")!.shiftCode).toBe("MORNING");
  });

  it("keeps the default when it fits best, and detects on a free day too", () => {
    const days = byDate(run({ ...shop, from: "2026-10-23", to: "2026-10-24", punches: [vn("2026-10-23", "07:58"), vn("2026-10-23", "17:02"), vn("2026-10-24", "06:00"), vn("2026-10-24", "14:00")] }));
    expect(days.get("2026-10-23")!.shiftCode).toBe("HC");
    expect(days.get("2026-10-23")!.result!.flags).not.toContain("auto_shift");
    // Saturday has no default shift: the punches make it a morning shift instead of work on a day off.
    expect([days.get("2026-10-24")!.shiftCode, days.get("2026-10-24")!.result!.status]).toEqual(["MORNING", "on_time"]);
  });

  it("leaves assigned days, holidays, days without punches and other departments alone", () => {
    const punches = [vn("2026-10-21", "14:00"), vn("2026-10-21", "22:00")];
    const assigned = byDate(run({ ...shop, from: "2026-10-21", to: "2026-10-21", punches, assignments: new Map([["2026-10-21", "hc"]]) }));
    expect(assigned.get("2026-10-21")!.shiftCode).toBe("HC");

    const holiday = byDate(run({ ...shop, from: "2026-10-21", to: "2026-10-21", punches, holidays: new Map([["2026-10-21", { type: "holiday", paid: true }]]) }));
    // Worked on a holiday: counted on the scheduled shift as before, never a detected one.
    expect(holiday.get("2026-10-21")!.shiftCode).toBe("HC");
    expect(holiday.get("2026-10-21")!.result!.flags).toEqual(expect.arrayContaining(["worked_on_holiday"]));
    expect(holiday.get("2026-10-21")!.result!.flags).not.toContain("auto_shift");

    const empty = byDate(run({ ...shop, from: "2026-10-21", to: "2026-10-21" }));
    expect([empty.get("2026-10-21")!.shiftCode, empty.get("2026-10-21")!.result!.status]).toEqual(["HC", "absent"]);

    const office = byDate(run({ ...shop, departmentId: "office", from: "2026-10-21", to: "2026-10-21", punches }));
    expect(office.get("2026-10-21")!.shiftCode).toBe("HC");
  });
});

// Phase 3b task 9: an approved explanation (LV-20) counts as the missing punch of its work date.
describe("calculateEmployeeDays with approved explanations", () => {
  it("fills a forgotten check-out", () => {
    const days = run({ punches: [vn("2026-10-21", "08:00")], explanations: new Map([["2026-10-21", [vn("2026-10-21", "17:00")]]]) });
    expect(days.find((day) => day.workDate === "2026-10-21")!.result).toMatchObject({ status: "on_time", workUnits: 1, flags: ["explained"] });
  });

  it("gives a night shift's explained check-out to the shift's date, not the calendar date", () => {
    const days = run({
      assignments: new Map([["2026-10-21", "night"]]),
      punches: [vn("2026-10-21", "22:00")],
      explanations: new Map([["2026-10-21", [vn("2026-10-22", "06:00")]]])
    });
    expect(days.find((day) => day.workDate === "2026-10-21")!.result).toMatchObject({ status: "on_time", workedMinutes: 480 });
    // The 06:00 check-out is not also taken by the next day's office shift.
    expect(days.find((day) => day.workDate === "2026-10-22")).toMatchObject({ punchCount: 0, result: { status: "absent" } });
  });

  it("passes approved time out and overtime through to the day", () => {
    const days = run({
      punches: [vn("2026-10-21", "08:00"), vn("2026-10-21", "17:00")],
      absences: new Map([["2026-10-21", [{ start: vn("2026-10-21", "14:00"), end: vn("2026-10-21", "16:00"), counted: false }]]]),
      overtime: new Map([["2026-10-21", 120]])
    });
    expect(days.find((day) => day.workDate === "2026-10-21")!.result).toMatchObject({ workedMinutes: 360, overtimeMinutes: 120 });
  });
});
