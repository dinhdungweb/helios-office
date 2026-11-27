import type {
  HolidayType,
  LateCountMode,
  MissingPunchMode,
  OutsideShiftMode,
  OvernightAttribution,
  PunchPairingMode,
  ShiftType,
  WorkUnitMode
} from "@prisma/client";
import { addDays, MINUTE, zonedInstant } from "./zoned-time";

// Attendance engine (AT-11): one employee, one work date → the day's result. Pure: no database, no
// clock, no server time zone. See docs/design/attendance-engine.md §6; the table of cases in §6.4 is
// the core of the unit tests.

export type EngineShift = {
  id: string;
  type: ShiftType;
  startMinute: number;
  endMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
  // Minutes that make the full shift (length − break for fixed shifts).
  requiredMinutes: number;
  workUnits: number;
};

// Company policy merged with the shift's overrides (shift-rules.resolveShiftRules).
export type EnginePolicy = {
  timezone: string;
  lateGraceMinutes: number;
  earlyGraceMinutes: number;
  lateCountMode: LateCountMode;
  missingPunchMode: MissingPunchMode;
  punchWindowBeforeMinutes: number;
  punchWindowAfterMinutes: number;
  roundingMinutes: number;
  punchPairing: PunchPairingMode;
  overnightAttribution: OvernightAttribution;
  workUnitMode: WorkUnitMode;
  workUnitRoundingHundredths: number;
  outsideShiftMode: OutsideShiftMode;
  holidayPaid: boolean;
  // AT-28: "minute" ignores the seconds of a punch (1Office's default); "second" counts them.
  lateEarlyUnit: "minute" | "second";
};

export type EngineHoliday = { type: HolidayType; paid: boolean };

// HR's manual changes (AT-15). Punches given here replace the recorded ones; units and status, when
// given, replace what the engine computed.
export type ManualOverride = {
  checkIn?: Date | null;
  checkOut?: Date | null;
  workUnits?: number | null;
  status?: AttendanceDayStatus | null;
};

// Approved leave on the date (AT-22, docs/design/approval-engine.md §8): units of the shift taken
// as paid / unpaid leave, and the leave's time windows when it covers part of the day only.
export type DayLeave = { paidUnits: number; unpaidUnits: number; windows: Array<{ start: Date; end: Date }> };

// Approved time out during the shift (LV-17): late / early minutes inside it are forgiven; time
// out on company business counts as worked, personal time out is taken off the hours worked.
export type DayAbsence = { start: Date; end: Date; counted: boolean };

export type DayInput = {
  workDate: string;
  shift: EngineShift | null;
  holiday: EngineHoliday | null;
  punches: Date[];
  policy: EnginePolicy;
  employment?: { startDate?: string | null; endDate?: string | null };
  manual?: ManualOverride | null;
  leave?: DayLeave | null;
  absences?: DayAbsence[];
  // Approved overtime on the date (LV-18), recorded as approved.
  overtimeMinutes?: number;
};

export type AttendanceDayStatus =
  | "on_time"
  | "late"
  | "early_leave"
  | "late_and_early"
  | "missing_checkin"
  | "missing_checkout"
  | "absent"
  | "holiday"
  | "day_off"
  | "leave";

export type DayResult = {
  workDate: string;
  shiftId: string | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  checkIn: Date | null;
  checkOut: Date | null;
  workedMinutes: number;
  lateMinutes: number;
  earlyMinutes: number;
  outsideShiftMinutes: number;
  nightMinutes: number;
  workUnits: number;
  paidLeaveUnits: number;
  overtimeMinutes: number;
  status: AttendanceDayStatus;
  flags: string[];
};

type Interval = { start: number; end: number };

const NIGHT_START_MINUTE = 22 * 60;
const NIGHT_END_MINUTE = 6 * 60;

function overlap(a: Interval, b: Interval) {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

function minutes(ms: number) {
  return Math.round(ms / MINUTE);
}

function intersect(a: Interval, b: Interval): Interval {
  return { start: Math.max(a.start, b.start), end: Math.min(a.end, b.end) };
}

// Sorted, non-overlapping intervals covering the same time.
export function unionIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((item) => item.end > item.start).sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const item of sorted) {
    const last = merged[merged.length - 1];
    if (last && item.start <= last.end) last.end = Math.max(last.end, item.end);
    else merged.push({ ...item });
  }
  return merged;
}

// The parts of `intervals` outside every one of `cuts`.
export function subtractIntervals(intervals: Interval[], cuts: Interval[]): Interval[] {
  let rest = unionIntervals(intervals);
  for (const cut of unionIntervals(cuts)) {
    rest = rest.flatMap((item) =>
      cut.end <= item.start || cut.start >= item.end
        ? [item]
        : [
            ...(cut.start > item.start ? [{ start: item.start, end: cut.start }] : []),
            ...(cut.end < item.end ? [{ start: cut.end, end: item.end }] : [])
          ]
    );
  }
  return rest;
}

// Rounds work units to a step given in hundredths (1 = 0.01, 25 = 0.25, 50 = 0.5), half up. Works
// in hundredths so 0.975 becomes 0.98 rather than a float landing just under 0.975.
function roundTo(units: number, stepHundredths: number) {
  const hundredths = Math.round(units * 100 * 1e6) / 1e6;
  return Math.round(hundredths / stepHundredths) * stepHundredths / 100;
}

// The shift's start/end instants for a work date, following the overnight attribution.
export function scheduleFor(workDate: string, shift: EngineShift, policy: Pick<EnginePolicy, "timezone" | "overnightAttribution">) {
  const overnight = shift.endMinute <= shift.startMinute;
  const startDate = overnight && policy.overnightAttribution === "shift_end" ? addDays(workDate, -1) : workDate;
  const length = overnight ? shift.endMinute + 1440 - shift.startMinute : shift.endMinute - shift.startMinute;
  const start = zonedInstant(startDate, shift.startMinute, policy.timezone);
  const breakInterval =
    shift.breakStartMinute !== null && shift.breakEndMinute !== null
      ? {
          start: start + (((shift.breakStartMinute - shift.startMinute + 1440) % 1440) * MINUTE),
          end: start + (((shift.breakEndMinute - shift.startMinute + 1440) % 1440) * MINUTE)
        }
      : null;

  return { startDate, start, end: start + length * MINUTE, breakInterval };
}

// Splits punches between consecutive scheduled days: each punch goes to the day whose collection
// window holds it, and to the nearer scheduled time when two windows overlap. No punch is used twice.
export function assignPunches(
  days: Array<{ workDate: string; start: number; end: number; windowBeforeMinutes: number; windowAfterMinutes: number }>,
  punches: Date[]
) {
  const assigned = new Map<string, Date[]>(days.map((day) => [day.workDate, []]));

  for (const punch of punches) {
    const time = punch.getTime();
    let best: { workDate: string; distance: number } | null = null;

    for (const day of days) {
      if (time < day.start - day.windowBeforeMinutes * MINUTE || time > day.end + day.windowAfterMinutes * MINUTE) continue;
      const distance = time < day.start ? day.start - time : time > day.end ? time - day.end : 0;
      if (!best || distance < best.distance) best = { workDate: day.workDate, distance };
    }

    if (best) assigned.get(best.workDate)!.push(punch);
  }

  return assigned;
}

function nightIntervals(startDate: string, timeZone: string): Interval[] {
  return [-1, 0, 1].map((offset) => {
    const date = addDays(startDate, offset);
    return { start: zonedInstant(date, NIGHT_START_MINUTE, timeZone), end: zonedInstant(addDays(date, 1), NIGHT_END_MINUTE, timeZone) };
  });
}

function roundPunch(time: number, roundingMinutes: number, direction: "up" | "down") {
  if (!roundingMinutes) return time;
  const step = roundingMinutes * MINUTE;
  return direction === "up" ? Math.ceil(time / step) * step : Math.floor(time / step) * step;
}

export function calculateDay(input: DayInput): DayResult | null {
  const { policy, shift, holiday, workDate } = input;
  const employment = input.employment ?? {};

  // 1. Not employed on this date: nothing to record.
  if ((employment.startDate && workDate < employment.startDate) || (employment.endDate && workDate > employment.endDate)) {
    return null;
  }

  const flags: string[] = [];
  const manual = input.manual ?? null;
  // Leave is applied before HR's manual figures, so a manual change still wins.
  let breakInterval: Interval | null = null;
  const overtimeMinutes = Math.max(0, Math.round(input.overtimeMinutes ?? 0));
  const absences: Array<Interval & { counted: boolean }> = (input.absences ?? [])
    .map((item) => ({ start: item.start.getTime(), end: item.end.getTime(), counted: item.counted }))
    .filter((item) => item.end > item.start);
  const finish = (result: DayResult) => {
    result.overtimeMinutes = overtimeMinutes;
    if (overtimeMinutes > 0) result.flags.push("overtime");
    return applyManual(applyLeave(result, input.leave ?? null, shift, policy, breakInterval), manual);
  };
  const punches = [...input.punches].map((punch) => punch.getTime()).sort((a, b) => a - b);
  const base: DayResult = {
    workDate,
    shiftId: shift?.id ?? null,
    scheduledStart: null,
    scheduledEnd: null,
    checkIn: null,
    checkOut: null,
    workedMinutes: 0,
    lateMinutes: 0,
    earlyMinutes: 0,
    outsideShiftMinutes: 0,
    nightMinutes: 0,
    workUnits: 0,
    paidLeaveUnits: 0,
    overtimeMinutes: 0,
    status: "day_off",
    flags
  };

  // A day without a shift: a day off (or a holiday on a free day). Punches are kept for reference.
  if (!shift) {
    if (punches.length > 0) {
      flags.push("worked_on_day_off");
      base.checkIn = new Date(punches[0]);
      base.checkOut = punches.length > 1 ? new Date(punches[punches.length - 1]) : null;
      base.outsideShiftMinutes = punches.length > 1 ? minutes(punches[punches.length - 1] - punches[0]) : 0;
    }
    base.status = holiday && holiday.type !== "compensatory_workday" ? "holiday" : "day_off";
    return finish(base);
  }

  // 2. The scheduled shift.
  const schedule = scheduleFor(workDate, shift, policy);
  const shiftInterval: Interval = { start: schedule.start, end: schedule.end };
  breakInterval = schedule.breakInterval ?? null;
  base.scheduledStart = new Date(schedule.start);
  base.scheduledEnd = new Date(schedule.end);

  const isHoliday = holiday !== null && holiday.type !== "compensatory_workday";
  const paidHoliday = isHoliday && holiday!.paid && (holiday!.type === "company_off" || policy.holidayPaid);
  if (paidHoliday) base.paidLeaveUnits = shift.workUnits;

  // 3–4. Check-in and check-out (manual punches replace recorded ones).
  let checkIn: number | null = null;
  let checkOut: number | null = null;
  let workIntervals: Interval[] = [];

  if (manual && (manual.checkIn !== undefined || manual.checkOut !== undefined)) {
    checkIn = manual.checkIn ? manual.checkIn.getTime() : null;
    checkOut = manual.checkOut ? manual.checkOut.getTime() : null;
  } else if (punches.length === 1) {
    const only = punches[0];
    if (Math.abs(only - schedule.start) <= Math.abs(only - schedule.end)) checkIn = only;
    else checkOut = only;
  } else if (punches.length > 1) {
    checkIn = punches[0];
    checkOut = punches[punches.length - 1];
    if (policy.punchPairing === "pairs") {
      for (let index = 0; index + 1 < punches.length; index += 2) {
        workIntervals.push({ start: punches[index], end: punches[index + 1] });
      }
      if (punches.length % 2 === 1) flags.push("unpaired_punch");
    }
  }

  // Time out on company business with no punch at all (out from the start to the end of the
  // window): the windows alone are the time worked.
  const counted = absences.filter((item) => item.counted).map((item) => intersect(item, shiftInterval)).filter((item) => item.end > item.start);
  const absenceOnly = checkIn === null && checkOut === null && counted.length > 0;
  if (absenceOnly) {
    checkIn = Math.min(...counted.map((item) => item.start));
    checkOut = Math.max(...counted.map((item) => item.end));
  }

  // 10. Nothing recorded on a scheduled day.
  if (checkIn === null && checkOut === null) {
    base.status = isHoliday ? "holiday" : "absent";
    return finish(base);
  }

  if (isHoliday) flags.push("worked_on_holiday");

  // 8. One punch missing.
  const missing: AttendanceDayStatus | null = checkIn === null ? "missing_checkin" : checkOut === null ? "missing_checkout" : null;
  if (missing && policy.missingPunchMode === "scheduled") {
    checkIn ??= schedule.start;
    checkOut ??= schedule.end;
    flags.push("filled_from_schedule");
  }

  base.checkIn = checkIn !== null && !absenceOnly ? new Date(checkIn) : null;
  base.checkOut = checkOut !== null && !absenceOnly ? new Date(checkOut) : null;

  if (missing && policy.missingPunchMode !== "scheduled") {
    base.status = missing;
    if (policy.missingPunchMode === "pending") {
      flags.push("needs_explanation");
    } else {
      base.workUnits = roundTo(shift.workUnits * 0.5, policy.workUnitRoundingHundredths);
    }
    return finish(base);
  }

  const roundedIn = roundPunch(checkIn!, policy.roundingMinutes, "up");
  const roundedOut = roundPunch(checkOut!, policy.roundingMinutes, "down");
  if (absenceOnly) {
    workIntervals = [];
  } else if (workIntervals.length === 0 || (manual && (manual.checkIn !== undefined || manual.checkOut !== undefined))) {
    workIntervals = [{ start: roundedIn, end: roundedOut }];
  }
  // LV-17: company time out is added to the time present, personal time out is taken off it.
  if (absences.length > 0) {
    flags.push("absence");
    workIntervals = subtractIntervals(
      [...workIntervals, ...counted],
      absences.filter((item) => !item.counted)
    );
  }

  // 5. Late arrival and early departure (fixed shifts only).
  if (shift.type === "fixed") {
    // By minute, 08:00:59 is on time and 16:59:30 is a minute early (the clock's minute counts);
    // by second, any second late counts as a minute.
    const lateMs = Math.max(0, roundedIn - schedule.start);
    const late = policy.lateEarlyUnit === "second" ? Math.ceil(lateMs / MINUTE) : Math.floor(lateMs / MINUTE);
    const early = Math.ceil(Math.max(0, schedule.end - roundedOut) / MINUTE);
    base.lateMinutes = late <= policy.lateGraceMinutes ? 0 : policy.lateCountMode === "excess" ? late - policy.lateGraceMinutes : late;
    base.earlyMinutes = early <= policy.earlyGraceMinutes ? 0 : policy.lateCountMode === "excess" ? early - policy.earlyGraceMinutes : early;
  }

  // 6. Worked minutes inside the shift, minus the break; the rest is outside the shift.
  //    Night minutes (22:00–06:00) are the worked minutes inside the shift that fall at night.
  const breakTime = (interval: Interval) => (schedule.breakInterval ? overlap(interval, schedule.breakInterval) : 0);
  const nights = nightIntervals(schedule.startDate, policy.timezone);
  let worked = 0;
  let outside = 0;
  let night = 0;
  for (const interval of workIntervals) {
    const inShift = intersect(interval, shiftInterval);
    const insideMs = overlap(interval, shiftInterval);
    worked += insideMs - breakTime(inShift);
    outside += Math.max(0, interval.end - interval.start) - insideMs;
    for (const window of nights) {
      const atNight = intersect(inShift, window);
      night += overlap(inShift, window) - breakTime(atNight);
    }
  }
  base.workedMinutes = minutes(worked);
  base.nightMinutes = minutes(Math.max(0, night));
  base.outsideShiftMinutes = policy.outsideShiftMode === "record" ? minutes(outside) : 0;

  // 7. Work units.
  const fraction = shift.requiredMinutes > 0 ? Math.min(1, base.workedMinutes / shift.requiredMinutes) : 0;
  base.workUnits =
    policy.workUnitMode === "presence"
      ? shift.workUnits
      : roundTo(shift.workUnits * fraction, policy.workUnitRoundingHundredths);

  // Late / early minutes inside approved time out are not violations.
  if (absences.length > 0) forgiveInside(base, absences, schedule.breakInterval ?? null);

  base.status =
    base.lateMinutes > 0 && base.earlyMinutes > 0 ? "late_and_early" : base.lateMinutes > 0 ? "late" : base.earlyMinutes > 0 ? "early_leave" : "on_time";
  if (missing) base.status = missing;

  return finish(base);
}

const WORKING_STATUSES = new Set<AttendanceDayStatus>(["on_time", "late", "early_leave", "late_and_early", "missing_checkin", "missing_checkout", "absent"]);

// 10b. Approved leave. A full day of leave replaces absence / missing punches / lateness with
// "leave"; part of a day forgives the late / early minutes that fall inside the leave. Worked units
// plus leave never exceed the shift.
function applyLeave(result: DayResult, leave: DayLeave | null, shift: EngineShift | null, policy: EnginePolicy, breakInterval: Interval | null): DayResult {
  if (!leave || !shift || leave.paidUnits + leave.unpaidUnits <= 0) return result;
  const taken = leave.paidUnits + leave.unpaidUnits;
  result.flags.push("leave");
  result.paidLeaveUnits = roundTo(result.paidLeaveUnits + leave.paidUnits, 1);
  result.workUnits = Math.max(0, Math.min(result.workUnits, roundTo(shift.workUnits - taken, policy.workUnitRoundingHundredths)));
  if (!WORKING_STATUSES.has(result.status)) return result;

  if (taken >= shift.workUnits - 0.001) {
    result.status = "leave";
    result.lateMinutes = 0;
    result.earlyMinutes = 0;
    result.flags = result.flags.filter((flag) => flag !== "needs_explanation");
    return result;
  }

  forgiveInside(
    result,
    leave.windows.map((window) => ({ start: window.start.getTime(), end: window.end.getTime() })),
    breakInterval
  );
  if (["on_time", "late", "early_leave", "late_and_early"].includes(result.status)) {
    result.status =
      result.lateMinutes > 0 && result.earlyMinutes > 0 ? "late_and_early" : result.lateMinutes > 0 ? "late" : result.earlyMinutes > 0 ? "early_leave" : "on_time";
  }
  return result;
}

// Takes off the late / early minutes that fall inside approved windows (leave, time out). The break
// next to a window is not lateness either (a half day off, then the afternoon worked).
function forgiveInside(result: DayResult, windows: Interval[], breakInterval: Interval | null) {
  if (windows.length === 0) return;
  const forgiven = breakInterval ? [...windows, breakInterval] : windows;
  const inside = (start: number, end: number) => unionIntervals(forgiven).reduce((sum, window) => sum + overlap({ start, end }, window), 0);
  if (result.scheduledStart && result.lateMinutes > 0) {
    const start = result.scheduledStart.getTime();
    result.lateMinutes = Math.max(0, result.lateMinutes - minutes(inside(start, start + result.lateMinutes * MINUTE)));
  }
  if (result.scheduledEnd && result.earlyMinutes > 0) {
    const end = result.scheduledEnd.getTime();
    result.earlyMinutes = Math.max(0, result.earlyMinutes - minutes(inside(end - result.earlyMinutes * MINUTE, end)));
  }
}

// 11. HR's figures win over the computed ones; the day is flagged so reports can show it.
function applyManual(result: DayResult, manual: ManualOverride | null): DayResult {
  if (!manual) return result;

  result.flags.push("adjusted");
  // HR may set any figure to the hundredth, whatever the policy's rounding step.
  if (manual.workUnits !== undefined && manual.workUnits !== null) result.workUnits = roundTo(manual.workUnits, 1);
  if (manual.status) result.status = manual.status;
  return result;
}
