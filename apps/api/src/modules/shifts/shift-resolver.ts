import type { HolidayType } from "@prisma/client";
import { addDays, isoWeekday } from "../attendance/engine/zoned-time";

// Which shift a person works on a date (docs/design/attendance-engine.md §5.3): their own
// assignment, else their department's default shift, else the company's, on working days only.

export type ScheduleSource = "assignment" | "department" | "company" | "none";

export type ResolvedDayShift = { shiftId: string | null; source: ScheduleSource };

export function resolveDayShift(input: {
  date: string;
  // undefined = no assignment; { shiftId: null } = assigned a day off.
  assignment?: { shiftId: string | null } | null;
  departmentDefaultShiftId?: string | null;
  companyDefaultShiftId?: string | null;
  workWeekdays: number[];
  holiday?: { type: HolidayType } | null;
}): ResolvedDayShift {
  if (input.assignment) {
    return { shiftId: input.assignment.shiftId, source: "assignment" };
  }

  // A make-up working day turns a free weekday into a working one.
  const workingDay = input.workWeekdays.includes(isoWeekday(input.date)) || input.holiday?.type === "compensatory_workday";
  if (!workingDay) return { shiftId: null, source: "none" };

  if (input.departmentDefaultShiftId) return { shiftId: input.departmentDefaultShiftId, source: "department" };
  if (input.companyDefaultShiftId) return { shiftId: input.companyDefaultShiftId, source: "company" };
  return { shiftId: null, source: "none" };
}

// Every calendar date from `from` to `to`, inclusive.
export function datesBetween(from: string, to: string) {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}
