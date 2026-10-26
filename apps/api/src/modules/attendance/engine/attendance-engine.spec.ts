import { assignPunches, calculateDay, scheduleFor, type DayInput, type EnginePolicy, type EngineShift } from "./attendance-engine";
import { addDays, isoWeekday, localDate, zonedInstant } from "./zoned-time";

// docs/design/attendance-engine.md §6.4. Times are Vietnam wall clock; every instant goes through
// the company time zone, so the result does not depend on the machine running the test.

const TZ = "Asia/Ho_Chi_Minh";
const at = (date: string, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(zonedInstant(date, hours * 60 + minutes, TZ));
};

const POLICY: EnginePolicy = {
  timezone: TZ,
  lateGraceMinutes: 5,
  earlyGraceMinutes: 5,
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
  lateEarlyUnit: "minute"
};

const OFFICE: EngineShift = { id: "hc", type: "fixed", startMinute: 480, endMinute: 1020, breakStartMinute: 720, breakEndMinute: 780, requiredMinutes: 480, workUnits: 1 };
const NIGHT: EngineShift = { id: "cd", type: "fixed", startMinute: 1320, endMinute: 360, breakStartMinute: null, breakEndMinute: null, requiredMinutes: 480, workUnits: 1 };
const FLEX: EngineShift = { id: "lh", type: "flexible", startMinute: 420, endMinute: 1140, breakStartMinute: null, breakEndMinute: null, requiredMinutes: 480, workUnits: 1 };

const DAY = "2026-10-21";
const day = (overrides: Partial<DayInput> & { times?: string[] } = {}) => {
  const { times = [], ...rest } = overrides;
  return calculateDay({ workDate: DAY, shift: OFFICE, holiday: null, punches: times.map((time) => at(DAY, time)), policy: POLICY, ...rest })!;
};

describe("zoned time", () => {
  it("converts Vietnam wall clock to instants and back, regardless of the server zone", () => {
    expect(new Date(zonedInstant(DAY, 480, TZ)).toISOString()).toBe("2026-10-21T01:00:00.000Z");
    expect(new Date(zonedInstant(DAY, 1440 + 360, TZ)).toISOString()).toBe("2026-10-21T23:00:00.000Z");
    expect(localDate(Date.parse("2026-10-21T18:30:00Z"), TZ)).toBe("2026-10-22");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect([isoWeekday("2026-10-19"), isoWeekday("2026-10-25")]).toEqual([1, 7]);
  });
});

describe("calculateDay — design §6.4 (office 08:00–17:00, break 12:00–13:00, grace 5')", () => {
  it.each([
    ["1 on time", ["07:55", "17:02"], { lateMinutes: 0, earlyMinutes: 0, workedMinutes: 480, workUnits: 1, status: "on_time" }],
    ["2 late within grace", ["08:04", "17:00"], { lateMinutes: 0, workedMinutes: 476, workUnits: 0.99, status: "on_time" }],
    ["3 late past grace", ["08:12", "17:00"], { lateMinutes: 12, workedMinutes: 468, workUnits: 0.98, status: "late" }],
    ["4 early leave", ["08:00", "16:30"], { earlyMinutes: 30, workedMinutes: 450, workUnits: 0.94, status: "early_leave" }],
    ["5 one punch at the start", ["08:00"], { workUnits: 0, status: "missing_checkout" }],
    ["6 no punches", [], { workUnits: 0, status: "absent" }],
    ["7 four punches, first and last", ["08:00", "12:00", "13:00", "17:00"], { workedMinutes: 480, workUnits: 1, status: "on_time" }],
    ["8 afternoon only", ["13:00", "17:00"], { lateMinutes: 300, workedMinutes: 240, workUnits: 0.5, status: "late" }]
  ] as const)("case %s", (_label, times, expected) => {
    expect(day({ times: [...times] })).toMatchObject(expected);
  });

  it("case 9: a night shift 22:00–06:00 is one work day on its start date", () => {
    const result = calculateDay({
      workDate: DAY,
      shift: NIGHT,
      holiday: null,
      punches: [at(DAY, "21:58"), at(addDays(DAY, 1), "06:01")],
      policy: POLICY
    })!;

    expect(result).toMatchObject({ workDate: DAY, workedMinutes: 480, nightMinutes: 480, workUnits: 1, status: "on_time" });
    expect(result.scheduledEnd!.toISOString()).toBe("2026-10-21T23:00:00.000Z");
  });

  it("marks a missing punch for explanation by default", () => {
    expect(day({ times: ["08:00"] }).flags).toContain("needs_explanation");
    expect(day({ times: ["17:01"] })).toMatchObject({ status: "missing_checkin", workUnits: 0 });
  });
});

describe("calculateDay — policy options", () => {
  it("counts only the minutes past grace in excess mode", () => {
    expect(day({ times: ["08:12", "17:00"], policy: { ...POLICY, lateCountMode: "excess" } }).lateMinutes).toBe(7);
  });

  it("gives full units on presence mode", () => {
    expect(day({ times: ["08:04", "17:00"], policy: { ...POLICY, workUnitMode: "presence" } }).workUnits).toBe(1);
  });

  it("rounds units to the configured step", () => {
    expect(day({ times: ["08:12", "17:00"], policy: { ...POLICY, workUnitRoundingHundredths: 50 } }).workUnits).toBe(1);
    expect(day({ times: ["13:00", "17:00"], policy: { ...POLICY, workUnitRoundingHundredths: 25 } }).workUnits).toBe(0.5);
  });

  it("rounds punches against the employee: check-in up, check-out down", () => {
    expect(day({ times: ["08:01", "16:59"], policy: { ...POLICY, roundingMinutes: 15 } })).toMatchObject({ lateMinutes: 15, earlyMinutes: 15 });
  });

  it("handles a missing punch as half a unit or fills it from the schedule", () => {
    expect(day({ times: ["08:00"], policy: { ...POLICY, missingPunchMode: "half" } })).toMatchObject({ status: "missing_checkout", workUnits: 0.5 });
    const filled = day({ times: ["08:00"], policy: { ...POLICY, missingPunchMode: "scheduled" } });
    expect(filled).toMatchObject({ status: "missing_checkout", workUnits: 1, workedMinutes: 480 });
    expect(filled.flags).toContain("filled_from_schedule");
  });

  it("subtracts time out in the middle when punches are paired", () => {
    const result = day({ times: ["08:00", "10:00", "11:00", "17:00"], policy: { ...POLICY, punchPairing: "pairs" } });
    expect(result).toMatchObject({ workedMinutes: 420, workUnits: 0.88 });
    expect(day({ times: ["08:00", "10:00", "11:00"], policy: { ...POLICY, punchPairing: "pairs" } }).flags).toContain("unpaired_punch");
  });

  it("records time outside the shift for reference unless told to ignore it", () => {
    expect(day({ times: ["07:00", "18:30"] })).toMatchObject({ workedMinutes: 480, outsideShiftMinutes: 150 });
    expect(day({ times: ["07:00", "18:30"], policy: { ...POLICY, outsideShiftMode: "ignore" } }).outsideShiftMinutes).toBe(0);
  });

  it("credits a night shift to its end date when configured", () => {
    const result = calculateDay({
      workDate: addDays(DAY, 1),
      shift: NIGHT,
      holiday: null,
      punches: [at(DAY, "22:00"), at(addDays(DAY, 1), "06:00")],
      policy: { ...POLICY, overnightAttribution: "shift_end" }
    })!;
    expect(result).toMatchObject({ workDate: "2026-10-22", workUnits: 1 });
  });
});

describe("calculateDay — shifts, holidays, employment, manual", () => {
  it("does not count lateness on a flexible shift, only hours", () => {
    expect(day({ shift: FLEX, times: ["09:30", "17:30"] })).toMatchObject({ lateMinutes: 0, workedMinutes: 480, workUnits: 1 });
    expect(day({ shift: FLEX, times: ["09:30", "15:30"] })).toMatchObject({ workedMinutes: 360, workUnits: 0.75 });
  });

  it("pays a holiday not worked, and flags one that was worked", () => {
    expect(day({ holiday: { type: "holiday", paid: true } })).toMatchObject({ status: "holiday", workUnits: 0, paidLeaveUnits: 1 });
    expect(day({ holiday: { type: "holiday", paid: true }, policy: { ...POLICY, holidayPaid: false } }).paidLeaveUnits).toBe(0);
    expect(day({ holiday: { type: "company_off", paid: false } })).toMatchObject({ status: "holiday", paidLeaveUnits: 0 });
    const worked = day({ holiday: { type: "holiday", paid: true }, times: ["08:00", "17:00"] });
    expect(worked).toMatchObject({ workUnits: 1, paidLeaveUnits: 1 });
    expect(worked.flags).toContain("worked_on_holiday");
  });

  it("treats a make-up working day as a normal working day", () => {
    expect(day({ holiday: { type: "compensatory_workday", paid: false } })).toMatchObject({ status: "absent", paidLeaveUnits: 0 });
  });

  it("keeps punches on a day off for reference without units", () => {
    const result = day({ shift: null, times: ["09:00", "11:00"] });
    expect(result).toMatchObject({ status: "day_off", workUnits: 0, outsideShiftMinutes: 120 });
    expect(result.flags).toContain("worked_on_day_off");
  });

  it("records nothing before the start date or after the end date", () => {
    expect(calculateDay({ workDate: DAY, shift: OFFICE, holiday: null, punches: [], policy: POLICY, employment: { startDate: "2026-11-01" } })).toBeNull();
    expect(calculateDay({ workDate: DAY, shift: OFFICE, holiday: null, punches: [], policy: POLICY, employment: { endDate: "2026-10-20" } })).toBeNull();
  });

  it("lets HR's punches drive the calculation and HR's units and status win", () => {
    const fixed = day({ times: ["08:00"], manual: { checkOut: at(DAY, "17:00") } });
    expect(fixed).toMatchObject({ status: "missing_checkin", workUnits: 0 });

    const both = day({ times: ["08:00"], manual: { checkIn: at(DAY, "08:00"), checkOut: at(DAY, "17:00") } });
    expect(both).toMatchObject({ status: "on_time", workUnits: 1 });
    expect(both.flags).toContain("adjusted");

    expect(day({ times: [], manual: { workUnits: 0.5, status: "on_time" } })).toMatchObject({ workUnits: 0.5, status: "on_time" });
  });
});

describe("assignPunches", () => {
  it("gives a punch between two shifts to the nearer one and never to both", () => {
    const today = scheduleFor(DAY, OFFICE, POLICY);
    const tonight = scheduleFor(DAY, NIGHT, POLICY);
    const days = [
      { workDate: "office", start: today.start, end: today.end, windowBeforeMinutes: 240, windowAfterMinutes: 240 },
      { workDate: "night", start: tonight.start, end: tonight.end, windowBeforeMinutes: 240, windowAfterMinutes: 240 }
    ];
    const assigned = assignPunches(days, [at(DAY, "17:05"), at(DAY, "21:55"), at(DAY, "19:10"), at(DAY, "03:00")]);

    expect(assigned.get("office")!.map((punch) => localTime(punch))).toEqual(["17:05", "19:10"]);
    expect(assigned.get("night")!.map((punch) => localTime(punch))).toEqual(["21:55"]);
  });
});

function localTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}
