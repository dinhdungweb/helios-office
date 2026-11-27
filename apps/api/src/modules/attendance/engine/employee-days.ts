import type { AttendancePolicy, HolidayType, Shift } from "@prisma/client";
import { requiredMinutesFor, resolveShiftRules } from "../../shifts/shift-rules";
import { datesBetween, resolveDayShift } from "../../shifts/shift-resolver";
import { assignPunches, calculateDay, scheduleFor, type DayAbsence, type DayLeave, type DayResult, type EnginePolicy, type EngineShift, type ManualOverride } from "./attendance-engine";
import { addDays, localDate, zonedInstant } from "./zoned-time";

// One employee over a range of work dates: resolves each date's shift, splits the punches between
// neighbouring shifts (a night shift's checkout belongs to the day before), then runs the engine.
// Pure; AttendanceCalculationService loads the inputs and stores the results.

export type CalcPolicy = Pick<
  AttendancePolicy,
  | "timezone"
  | "workWeekdays"
  | "defaultShiftId"
  | "lateGraceMinutes"
  | "earlyGraceMinutes"
  | "lateCountMode"
  | "missingPunchMode"
  | "punchWindowBeforeMinutes"
  | "punchWindowAfterMinutes"
  | "roundingMinutes"
  | "punchPairing"
  | "overnightAttribution"
  | "workUnitMode"
  | "workUnitRoundingHundredths"
  | "outsideShiftMode"
  | "holidayPaid"
  | "lateEarlyUnit"
  | "overnightSplit"
  | "continuousShiftMaxDays"
>;

export type CalcShift = Pick<
  Shift,
  | "id"
  | "code"
  | "type"
  | "startMinute"
  | "endMinute"
  | "breakStartMinute"
  | "breakEndMinute"
  | "requiredMinutes"
  | "lateGraceMinutes"
  | "earlyGraceMinutes"
  | "lateCountMode"
  | "missingPunchMode"
  | "punchWindowBeforeMinutes"
  | "punchWindowAfterMinutes"
  | "autoDetect"
  | "applyDepartmentIds"
  | "applyPositionIds"
> & { workUnits: number };

export type EmployeeDaysInput = {
  from: string;
  to: string;
  policy: CalcPolicy;
  shifts: Map<string, CalcShift>;
  holidays: Map<string, { type: HolidayType; paid: boolean }>;
  // Dates with an assignment; shiftId null = assigned a day off.
  assignments: Map<string, string | null>;
  departmentDefaultShiftId: string | null;
  // AT-29: who the person is, for shifts detected from punches.
  departmentId?: string | null;
  positionId?: string | null;
  employment: { startDate: string | null; endDate: string | null };
  punches: Date[];
  manual: Map<string, ManualOverride>;
  // AT-22: approved leave by date.
  leave?: Map<string, DayLeave>;
  // AT-22 for the other request types: approved time out, overtime minutes, and the check-in /
  // check-out times of approved explanations (LV-20), which count as punches of that work date.
  absences?: Map<string, DayAbsence[]>;
  overtime?: Map<string, number>;
  explanations?: Map<string, Date[]>;
};

export type EmployeeDay = { workDate: string; result: DayResult | null; shiftCode: string | null; holidayType: HolidayType | null; punchCount: number; policy: EnginePolicy | null };

export function enginePolicyFor(policy: CalcPolicy, shift: CalcShift | null): EnginePolicy {
  return {
    timezone: policy.timezone,
    ...resolveShiftRules(policy, shift ?? {}),
    roundingMinutes: policy.roundingMinutes,
    punchPairing: policy.punchPairing,
    overnightAttribution: policy.overnightAttribution,
    workUnitMode: policy.workUnitMode,
    workUnitRoundingHundredths: policy.workUnitRoundingHundredths,
    outsideShiftMode: policy.outsideShiftMode,
    holidayPaid: policy.holidayPaid,
    lateEarlyUnit: policy.lateEarlyUnit === "second" ? "second" : "minute"
  };
}

// How many days around a date its result may depend on (AT-28): a run of consecutive shift days
// reaches N − 1 days, and splitting overnight hours reaches the next day. Recalculations widen
// their range by this much, and load this much more as context.
export function dependencyReach(policy: Pick<CalcPolicy, "overnightSplit" | "continuousShiftMaxDays">) {
  const run = Number.isInteger(policy.continuousShiftMaxDays) ? Math.min(30, Math.max(0, policy.continuousShiftMaxDays - 1)) : 0;
  return run + (policy.overnightSplit === "split" || policy.overnightSplit === "split_full" ? 1 : 0);
}

export function engineShiftFor(shift: CalcShift): EngineShift {
  return {
    id: shift.id,
    type: shift.type,
    startMinute: shift.startMinute,
    endMinute: shift.endMinute,
    breakStartMinute: shift.breakStartMinute,
    breakEndMinute: shift.breakEndMinute,
    requiredMinutes: requiredMinutesFor(shift),
    workUnits: shift.workUnits
  };
}

export function calculateEmployeeDays(input: EmployeeDaysInput): EmployeeDay[] {
  const { policy } = input;
  // Days either side are computed as context: punches near midnight, runs of shift days and
  // split overnight hours may cross the edge of the range. Only from..to are returned.
  const context = 1 + 2 * dependencyReach(policy);
  const dates = datesBetween(addDays(input.from, -context), addDays(input.to, context));

  const detectable = [...input.shifts.values()].filter(
    (shift) =>
      shift.autoDetect &&
      (shift.applyDepartmentIds.length === 0 || (input.departmentId != null && shift.applyDepartmentIds.includes(input.departmentId))) &&
      (shift.applyPositionIds.length === 0 || (input.positionId != null && shift.applyPositionIds.includes(input.positionId)))
  );
  const plan = dates.map((date) => {
    const holiday = input.holidays.get(date) ?? null;
    const resolved = resolveDayShift({
      date,
      assignment: input.assignments.has(date) ? { shiftId: input.assignments.get(date)! } : undefined,
      departmentDefaultShiftId: input.departmentDefaultShiftId,
      companyDefaultShiftId: policy.defaultShiftId,
      workWeekdays: policy.workWeekdays,
      holiday
    });
    // An archived or deleted shift still on the schedule counts as no shift.
    let shift = resolved.shiftId ? input.shifts.get(resolved.shiftId) ?? null : null;
    let autoDetected = false;
    // AT-29: without an assignment (and outside holidays) the punches may pick a detected shift.
    const offForHoliday = holiday !== null && holiday.type !== "compensatory_workday";
    if (detectable.length > 0 && !input.assignments.has(date) && !offForHoliday) {
      const picked = detectShift(date, shift ? [shift, ...detectable.filter((item) => item.id !== shift!.id)] : detectable, input.punches, policy);
      if (picked && picked.id !== shift?.id) {
        shift = picked;
        autoDetected = true;
      }
    }
    return { date, holiday, shift, autoDetected, enginePolicy: enginePolicyFor(policy, shift) };
  });

  const scheduled = plan
    .filter((day) => day.shift)
    .map((day) => {
      const schedule = scheduleFor(day.date, engineShiftFor(day.shift!), day.enginePolicy);
      return {
        workDate: day.date,
        start: schedule.start,
        end: schedule.end,
        windowBeforeMinutes: day.enginePolicy.punchWindowBeforeMinutes,
        windowAfterMinutes: day.enginePolicy.punchWindowAfterMinutes
      };
    });
  const assigned = assignPunches(scheduled, input.punches);
  const used = new Set([...assigned.values()].flat().map((punch) => punch.getTime()));

  // Punches outside every shift's window stay on their own calendar date when that date has no
  // shift (work on a day off); on a shift day they fall outside the window and are not counted.
  const free = new Map<string, Date[]>();
  for (const punch of input.punches) {
    if (used.has(punch.getTime())) continue;
    const date = localDate(punch.getTime(), policy.timezone);
    free.set(date, [...(free.get(date) ?? []), punch]);
  }

  const days = plan.map((day) => {
    const explained = input.explanations?.get(day.date) ?? [];
    const recorded = day.shift ? assigned.get(day.date) ?? [] : free.get(day.date) ?? [];
    const punches = explained.length > 0 ? [...recorded, ...explained].sort((a, b) => a.getTime() - b.getTime()) : recorded;
    const input_ = {
      workDate: day.date,
      shift: day.shift ? engineShiftFor(day.shift) : null,
      holiday: day.holiday,
      punches,
      policy: day.enginePolicy,
      employment: input.employment,
      manual: input.manual.get(day.date) ?? null,
      leave: input.leave?.get(day.date) ?? null,
      absences: input.absences?.get(day.date) ?? [],
      overtimeMinutes: input.overtime?.get(day.date) ?? 0
    };
    const result = calculateDay(input_);
    if (result && day.autoDetected) result.flags.push("auto_shift");
    if (result && explained.length > 0) result.flags.push("explained");
    return { ...day, input: input_, punches, result };
  });

  if (policy.continuousShiftMaxDays >= 2) joinContinuousShifts(days, policy.continuousShiftMaxDays);
  if (policy.overnightSplit === "split" || policy.overnightSplit === "split_full") splitOvernight(days, policy.overnightSplit, policy.timezone);

  return days
    .filter((day) => day.date >= input.from && day.date <= input.to)
    .map((day) => ({
      workDate: day.date,
      result: day.result,
      shiftCode: day.shift?.code ?? null,
      holidayType: day.holiday?.type ?? null,
      punchCount: day.punches.length,
      policy: day.result ? day.enginePolicy : null
    }));
}

// AT-29: the candidate whose punch window holds the most punches, then the one whose start and end
// are closest to the first and last of them. A punch on the date itself is needed, so a shift is
// never taken from the neighbouring day's punches alone.
function detectShift(date: string, candidates: CalcShift[], punches: Date[], policy: CalcPolicy) {
  let best: { shift: CalcShift; count: number; distance: number } | null = null;
  for (const candidate of candidates) {
    const enginePolicy = enginePolicyFor(policy, candidate);
    const schedule = scheduleFor(date, engineShiftFor(candidate), enginePolicy);
    const from = schedule.start - enginePolicy.punchWindowBeforeMinutes * 60_000;
    const to = schedule.end + enginePolicy.punchWindowAfterMinutes * 60_000;
    const inside = punches.map((punch) => punch.getTime()).filter((time) => time >= from && time <= to).sort((a, b) => a - b);
    if (!inside.some((time) => localDate(time, policy.timezone) === date)) continue;
    const distance = Math.abs(inside[0] - schedule.start) + (inside.length > 1 ? Math.abs(inside[inside.length - 1] - schedule.end) : 0);
    if (!best || inside.length > best.count || (inside.length === best.count && distance < best.distance)) best = { shift: candidate, count: inside.length, distance };
  }
  return best?.shift ?? null;
}

type PlannedDay = {
  date: string;
  shift: CalcShift | null;
  input: Parameters<typeof calculateDay>[0];
  result: DayResult | null;
};

// AT-28, "Số ngày liên tiếp cho phép không cần checkin/out": on up to `maxDays` consecutive shift
// days, a check-in on the first day and a check-out on the last make the whole run count, the days
// in between included. Only untouched days qualify (no HR change, nothing punched in between).
function joinContinuousShifts(days: PlannedDay[], maxDays: number) {
  const plain = (day: PlannedDay | undefined) =>
    Boolean(day?.shift && day.result && !day.input.manual && !day.input.leave && !day.input.absences?.length && !day.result.flags.includes("explained"));
  for (let first = 0; first < days.length; first += 1) {
    if (!plain(days[first]) || days[first].result!.status !== "missing_checkout") continue;
    for (let last = first + 1; last < days.length && last - first + 1 <= maxDays; last += 1) {
      const day = days[last];
      if (!plain(day) || addDays(days[last - 1].date, 1) !== day.date) break;
      if (day.result!.status === "missing_checkin") {
        for (let index = first; index <= last; index += 1) {
          const current = days[index];
          const schedule = scheduleFor(current.date, current.input.shift!, current.input.policy);
          const start = index === first ? current.result!.checkIn! : new Date(schedule.start);
          const end = index === last ? current.result!.checkOut! : new Date(schedule.end);
          current.result = calculateDay({ ...current.input, punches: [start, end] });
          current.result?.flags.push("continuous_shift");
        }
        first = last;
        break;
      }
      if (day.result!.status !== "absent") break;
    }
  }
}

// AT-28, "Tách giờ làm việc qua ngày": hours of a shift that crosses midnight are shared with the
// next calendar day. "split" shares what was actually worked after midnight; "split_full" shares
// by the shift's own hours before/after midnight. Late, early and holiday pay stay on the shift's day.
function splitOvernight(days: PlannedDay[], mode: "split" | "split_full", timeZone: string) {
  for (let index = 0; index + 1 < days.length; index += 1) {
    const day = days[index];
    const next = days[index + 1];
    const result = day.result;
    if (!day.shift || !result || !next.result || addDays(day.date, 1) !== next.date) continue;
    if (day.shift.endMinute > day.shift.startMinute || result.workedMinutes <= 0 || !result.scheduledStart || !result.scheduledEnd) continue;

    const start = result.scheduledStart.getTime();
    const end = result.scheduledEnd.getTime();
    const midnight = zonedInstant(addDays(localDate(start, timeZone), 1), 0, timeZone);
    if (midnight <= start || midnight >= end) continue;
    let before: number;
    if (mode === "split_full" || !result.checkIn || !result.checkOut) {
      before = (midnight - start) / (end - start);
    } else {
      const workStart = Math.max(start, result.checkIn.getTime());
      const workEnd = Math.min(end, result.checkOut.getTime());
      before = workEnd > workStart ? Math.max(0, Math.min(midnight, workEnd) - workStart) / (workEnd - workStart) : 1;
    }
    if (before >= 1) continue;

    const share = (value: number, step = 1) => Math.round((value * before) / step) * step;
    const keptMinutes = share(result.workedMinutes);
    const keptNight = share(result.nightMinutes);
    const keptUnits = Math.round(result.workUnits * before * 100) / 100;
    next.result.workedMinutes += result.workedMinutes - keptMinutes;
    next.result.nightMinutes += result.nightMinutes - keptNight;
    next.result.workUnits = Math.round((next.result.workUnits + result.workUnits - keptUnits) * 100) / 100;
    next.result.flags.push("split_from_previous");
    result.workedMinutes = keptMinutes;
    result.nightMinutes = keptNight;
    result.workUnits = keptUnits;
    result.flags.push("split_to_next");
  }
}
