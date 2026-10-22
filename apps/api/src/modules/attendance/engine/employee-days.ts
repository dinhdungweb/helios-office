import type { AttendancePolicy, HolidayType, Shift } from "@prisma/client";
import { requiredMinutesFor, resolveShiftRules } from "../../shifts/shift-rules";
import { datesBetween, resolveDayShift } from "../../shifts/shift-resolver";
import { assignPunches, calculateDay, scheduleFor, type DayResult, type EnginePolicy, type EngineShift, type ManualOverride } from "./attendance-engine";
import { addDays, localDate } from "./zoned-time";

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
  employment: { startDate: string | null; endDate: string | null };
  punches: Date[];
  manual: Map<string, ManualOverride>;
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
    holidayPaid: policy.holidayPaid
  };
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
  // One day either side, so punches near midnight go to the right neighbour.
  const dates = datesBetween(addDays(input.from, -1), addDays(input.to, 1));

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
    const shift = resolved.shiftId ? input.shifts.get(resolved.shiftId) ?? null : null;
    return { date, holiday, shift, enginePolicy: enginePolicyFor(policy, shift) };
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

  return plan
    .filter((day) => day.date >= input.from && day.date <= input.to)
    .map((day) => {
      const punches = day.shift ? assigned.get(day.date) ?? [] : free.get(day.date) ?? [];
      const result = calculateDay({
        workDate: day.date,
        shift: day.shift ? engineShiftFor(day.shift) : null,
        holiday: day.holiday,
        punches,
        policy: day.enginePolicy,
        employment: input.employment,
        manual: input.manual.get(day.date) ?? null
      });
      return {
        workDate: day.date,
        result,
        shiftCode: day.shift?.code ?? null,
        holidayType: day.holiday?.type ?? null,
        punchCount: punches.length,
        policy: result ? day.enginePolicy : null
      };
    });
}
