import { addDays } from "../attendance/engine/zoned-time";
import { MINUTES_PER_DAY, offsetFromStart, shiftLengthMinutes } from "../shifts/shift-rules";

// Leave rules (docs/design/approval-engine.md §7). Pure; dates are YYYY-MM-DD in the company zone.

export type LeaveRange = { fromDate: string; toDate: string; fromTime?: string | null; toTime?: string | null };

// The shift worked on a date, or null for a day off / holiday.
export type LeaveDayShift = {
  startMinute: number;
  endMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
  requiredMinutes: number;
  workUnits: number;
  flexible: boolean;
};

export type LeaveDay = { date: string; minutes: number; units: number };

export type MinUnit = "day" | "half_day" | "hour";

export function roundHalf(value: number) {
  return Math.round(value * 2) / 2;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  return minute < MINUTES_PER_DAY ? minute : null;
}

function overlap(start: number, end: number, otherStart: number, otherEnd: number) {
  return Math.max(0, Math.min(end, otherEnd) - Math.max(start, otherStart));
}

// Minutes of the shift covered between two times of day (offsets follow the shift past midnight).
function coveredMinutes(shift: LeaveDayShift, fromMinute: number | null, toMinute: number | null) {
  if (shift.flexible) {
    // A flexible shift has no fixed hours: a part day counts by its own length.
    if (fromMinute === null && toMinute === null) return shift.requiredMinutes;
    const from = fromMinute ?? 0;
    const to = toMinute ?? MINUTES_PER_DAY;
    return Math.min(shift.requiredMinutes, Math.max(0, to - from));
  }
  const length = shiftLengthMinutes(shift.startMinute, shift.endMinute);
  const start = fromMinute === null ? 0 : Math.min(length, offsetFromStart(shift.startMinute, fromMinute));
  const rawEnd = toMinute === null ? length : offsetFromStart(shift.startMinute, toMinute);
  // "17:00" on a 08:00–17:00 shift is the end, not the start of the next day.
  const end = toMinute !== null && rawEnd === 0 ? length : Math.min(length, rawEnd);
  if (end <= start) return 0;
  let minutes = end - start;
  if (shift.breakStartMinute !== null && shift.breakEndMinute !== null) {
    const breakStart = offsetFromStart(shift.startMinute, shift.breakStartMinute);
    const breakEnd = offsetFromStart(shift.startMinute, shift.breakEndMinute);
    minutes -= overlap(start, end, breakStart, breakEnd);
  }
  return Math.min(minutes, shift.requiredMinutes);
}

export type LeaveUnitsResult = { days: LeaveDay[]; total: number; errors: string[] };

// LV-15: how much leave a set of ranges takes, by the shifts worked on those dates. Days off and
// holidays count zero. `minUnit` rounds each day: whole days, halves, or exact hours.
export function leaveUnits(ranges: LeaveRange[], shiftOn: (date: string) => LeaveDayShift | null, minUnit: MinUnit): LeaveUnitsResult {
  const errors: string[] = [];
  const byDate = new Map<string, LeaveDay>();

  for (const range of ranges) {
    if (range.toDate < range.fromDate) {
      errors.push(`Khoảng ${range.fromDate} → ${range.toDate}: ngày kết thúc trước ngày bắt đầu.`);
      continue;
    }
    const fromMinute = parseTime(range.fromTime);
    const toMinute = parseTime(range.toTime);
    if ((range.fromTime && fromMinute === null) || (range.toTime && toMinute === null)) {
      errors.push("Giờ nghỉ phải theo dạng HH:mm.");
      continue;
    }

    for (let date = range.fromDate; date <= range.toDate; date = addDays(date, 1)) {
      const shift = shiftOn(date);
      if (!shift || shift.requiredMinutes <= 0) continue;
      const minutes = coveredMinutes(shift, date === range.fromDate ? fromMinute : null, date === range.toDate ? toMinute : null);
      if (minutes <= 0) continue;

      const fraction = minutes / shift.requiredMinutes;
      let units: number;
      if (minUnit === "day") {
        if (fraction < 1) errors.push(`Loại nghỉ này chỉ nghỉ cả ngày (ngày ${date} đang chọn một phần ngày).`);
        units = shift.workUnits;
      } else if (minUnit === "half_day") {
        units = (fraction <= 0.5 ? 0.5 : 1) * shift.workUnits;
      } else {
        units = round2(fraction * shift.workUnits);
      }

      const existing = byDate.get(date);
      if (existing) {
        errors.push(`Ngày ${date} bị chọn trùng ở hai khoảng thời gian.`);
        continue;
      }
      byDate.set(date, { date, minutes, units });
    }
  }

  const days = [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
  return { days, total: round2(days.reduce((sum, day) => sum + day.units, 0)), errors };
}

// Leave taken per calendar year (a request over New Year charges both years' balances).
export function unitsByYear(days: Array<Pick<LeaveDay, "date" | "units">>): Map<number, number> {
  const result = new Map<number, number>();
  for (const day of days) {
    const year = Number(day.date.slice(0, 4));
    result.set(year, round2((result.get(year) ?? 0) + day.units));
  }
  return result;
}

export const ANNUAL_LEAVE_DAYS = 12;
export const SENIORITY_STEP_YEARS = 5;

function fullYearsBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return ty - fy - (tm < fm || (tm === fm && td < fd) ? 1 : 0);
}

// +1 day for every 5 full years of service (Labour Code 2019, Art. 114), counted at `asOf`.
export function seniorityBonus(startDate: string, asOf: string) {
  return Math.max(0, Math.floor(fullYearsBetween(startDate, asOf) / SENIORITY_STEP_YEARS));
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

// LV-13: annual leave a person should have accrued in `year` once month `month` (1–12) has begun.
// One twelfth of the yearly entitlement per month worked, rounded to half days; the month of joining
// counts when they joined before the 15th; months after leaving do not count.
export function accrualTarget(person: { startDate: string; endDate?: string | null }, year: number, month: number, base = ANNUAL_LEAVE_DAYS) {
  let months = 0;
  for (let m = 1; m <= month; m++) {
    const monthStart = `${year}-${String(m).padStart(2, "0")}-01`;
    const monthEnd = lastDayOfMonth(year, m);
    if (person.startDate > monthEnd) continue;
    if (person.startDate >= monthStart && Number(person.startDate.slice(8, 10)) >= 15) continue;
    if (person.endDate && person.endDate < monthStart) continue;
    months++;
  }
  const yearly = base + seniorityBonus(person.startDate, lastDayOfMonth(year, month));
  return roundHalf((yearly * months) / 12);
}

export type BalanceTotals = { entitled: number; carriedOver: number; adjusted: number; used: number; pending: number; expired: number };

export function availableOf(balance: BalanceTotals) {
  return round2(balance.entitled + balance.carriedOver + balance.adjusted - balance.used - balance.pending - balance.expired);
}

// Days left to carry into the next year: everything not used or expired (pending requests are for
// dates of this year and settle against it).
export function carryOverOf(balance: BalanceTotals) {
  return Math.max(0, round2(balance.entitled + balance.carriedOver + balance.adjusted - balance.used - balance.expired));
}

// Carried-over days are used first; what is left of them expires on carryOverExpiresAt.
export function expiringCarryOver(balance: BalanceTotals) {
  return Math.max(0, round2(balance.carriedOver - balance.used - balance.expired));
}
