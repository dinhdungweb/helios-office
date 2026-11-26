import { accrualTarget, availableOf, carryOverOf, expiringCarryOver, leaveUnits, roundHalf, seniorityBonus, unitsByYear, type LeaveDayShift } from "./leave-rules";

const office: LeaveDayShift = { startMinute: 480, endMinute: 1020, breakStartMinute: 720, breakEndMinute: 780, requiredMinutes: 480, workUnits: 1, flexible: false };
const night: LeaveDayShift = { startMinute: 1320, endMinute: 360, breakStartMinute: null, breakEndMinute: null, requiredMinutes: 480, workUnits: 1, flexible: false };

// Mon–Fri office shift; 2026-12-05/06 is a weekend, 2026-12-24 a company day off.
function schedule(shift = office) {
  return (date: string) => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6 || date === "2026-12-24") return null;
    return shift;
  };
}

describe("leaveUnits (LV-15)", () => {
  it("counts working days only", () => {
    const result = leaveUnits([{ fromDate: "2026-12-04", toDate: "2026-12-08" }], schedule(), "half_day");
    expect(result.days.map((day) => day.date)).toEqual(["2026-12-04", "2026-12-07", "2026-12-08"]);
    expect(result.total).toBe(3);
  });

  it("skips holidays in the middle of a range", () => {
    expect(leaveUnits([{ fromDate: "2026-12-23", toDate: "2026-12-25" }], schedule(), "half_day").total).toBe(2);
  });

  it.each([
    ["morning", "08:00", "12:00", 0.5],
    ["afternoon", "13:00", "17:00", 0.5],
    ["morning plus an hour", "08:00", "14:00", 1],
    ["across the break", "11:00", "14:00", 0.5]
  ])("rounds a %s to half days", (_name, fromTime, toTime, expected) => {
    expect(leaveUnits([{ fromDate: "2026-12-01", toDate: "2026-12-01", fromTime, toTime }], schedule(), "half_day").total).toBe(expected);
  });

  it("counts hours exactly for hourly leave, minus the break", () => {
    const result = leaveUnits([{ fromDate: "2026-12-01", toDate: "2026-12-01", fromTime: "10:00", toTime: "14:00" }], schedule(), "hour");
    expect(result.days[0].minutes).toBe(180);
    expect(result.total).toBe(0.38);
  });

  it("refuses part days for whole-day leave types", () => {
    const result = leaveUnits([{ fromDate: "2026-12-01", toDate: "2026-12-01", fromTime: "08:00", toTime: "12:00" }], schedule(), "day");
    expect(result.errors[0]).toContain("cả ngày");
  });

  it("uses the start time on the first day and the end time on the last", () => {
    const result = leaveUnits([{ fromDate: "2026-12-01", toDate: "2026-12-02", fromTime: "13:00", toTime: "12:00" }], schedule(), "half_day");
    expect(result.days.map((day) => day.units)).toEqual([0.5, 0.5]);
  });

  it("follows a night shift past midnight", () => {
    expect(leaveUnits([{ fromDate: "2026-12-01", toDate: "2026-12-01" }], schedule(night), "half_day").total).toBe(1);
    expect(leaveUnits([{ fromDate: "2026-12-01", toDate: "2026-12-01", fromTime: "02:00", toTime: "06:00" }], schedule(night), "half_day").total).toBe(0.5);
  });

  it("reports overlapping ranges and reversed dates", () => {
    expect(leaveUnits([{ fromDate: "2026-12-01", toDate: "2026-12-02" }, { fromDate: "2026-12-02", toDate: "2026-12-03" }], schedule(), "half_day").errors[0]).toContain("trùng");
    expect(leaveUnits([{ fromDate: "2026-12-05", toDate: "2026-12-01" }], schedule(), "half_day").errors[0]).toContain("trước ngày bắt đầu");
  });

  it("splits a New Year request by year", () => {
    const result = leaveUnits([{ fromDate: "2026-12-30", toDate: "2027-01-04" }], (date) => (date === "2027-01-01" ? null : schedule()(date)), "half_day");
    expect([...unitsByYear(result.days)]).toEqual([
      [2026, 2],
      [2027, 1]
    ]);
  });
});

describe("accrual (LV-13)", () => {
  it.each([
    ["a full year by December", { startDate: "2023-03-01" }, 12, 12],
    ["one twelfth a month, rounded to halves", { startDate: "2024-01-10" }, 1, 1],
    ["half way", { startDate: "2024-01-10" }, 6, 6],
    ["joining before the 15th counts the month", { startDate: "2026-03-14" }, 3, 1],
    ["joining on the 15th does not", { startDate: "2026-03-15" }, 3, 0],
    ["nothing before joining", { startDate: "2026-09-01" }, 6, 0],
    ["stops after leaving", { startDate: "2023-01-01", endDate: "2026-06-20" }, 12, 6]
  ])("%s", (_name, person, month, expected) => {
    expect(accrualTarget(person, 2026, month)).toBe(expected);
  });

  it("adds a day for every five full years", () => {
    expect(seniorityBonus("2016-12-31", "2026-12-31")).toBe(2);
    expect(seniorityBonus("2021-12-31", "2026-12-30")).toBe(0);
    expect(accrualTarget({ startDate: "2016-01-01" }, 2026, 12)).toBe(14);
  });

  it("rounds to half days", () => {
    expect(roundHalf(0.24)).toBe(0);
    expect(roundHalf(0.26)).toBe(0.5);
    expect(roundHalf(1.75)).toBe(2);
  });
});

describe("balance totals", () => {
  const balance = { entitled: 12, carriedOver: 3, adjusted: 1, used: 4, pending: 2, expired: 0 };

  it("computes what is available", () => {
    expect(availableOf(balance)).toBe(10);
  });

  it("carries everything not used, ignoring pending", () => {
    expect(carryOverOf(balance)).toBe(12);
  });

  it("uses carried days first, then expires the rest", () => {
    expect(expiringCarryOver(balance)).toBe(0);
    expect(expiringCarryOver({ ...balance, used: 1 })).toBe(2);
    expect(expiringCarryOver({ ...balance, used: 1, expired: 2 })).toBe(0);
  });
});
