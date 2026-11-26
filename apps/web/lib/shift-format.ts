// Types and HH:MM helpers for the shift catalogue and attendance policy (AT-05, AT-06), safe to
// import from client components. Server fetching lives in shift-api.ts.

export type ShiftType = "fixed" | "flexible";
export type LateCountMode = "full" | "excess";
export type MissingPunchMode = "pending" | "half" | "scheduled";

export type ShiftRecord = {
  id: string;
  code: string;
  name: string;
  type: ShiftType;
  color: string | null;
  startMinute: number;
  endMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
  requiredMinutes: number;
  workUnits: number;
  lateGraceMinutes: number | null;
  earlyGraceMinutes: number | null;
  lateCountMode: LateCountMode | null;
  missingPunchMode: MissingPunchMode | null;
  punchWindowBeforeMinutes: number | null;
  punchWindowAfterMinutes: number | null;
  description: string | null;
  // AT-29: detected from punches on days without an assignment, for these groups (empty = all).
  autoDetect: boolean;
  applyDepartmentIds: string[];
  applyPositionIds: string[];
  // Check-in places of the shift, used when GPS / Wifi check applicable entities (as 1Office).
  locationIds: string[];
  status: "active" | "archived";
  usage: { departmentDefaults: number; companyDefault: boolean; assignments: number };
};

export type AttendancePolicy = {
  timezone: string;
  workWeekdays: number[];
  defaultShiftId: string | null;
  defaultShift: { id: string; code: string; name: string; status: string } | null;
  lateGraceMinutes: number;
  earlyGraceMinutes: number;
  lateCountMode: LateCountMode;
  roundingMinutes: number;
  punchPairing: "first_last" | "pairs";
  punchWindowBeforeMinutes: number;
  punchWindowAfterMinutes: number;
  overnightAttribution: "shift_start" | "shift_end";
  missingPunchMode: MissingPunchMode;
  workUnitMode: "actual" | "presence";
  workUnitRoundingHundredths: number;
  outsideShiftMode: "record" | "ignore";
  overtimeWeekdayPercent: number;
  overtimeRestDayPercent: number;
  overtimeHolidayPercent: number;
  nightAllowancePercent: number;
  holidayPaid: boolean;
  requireTimesheetConfirmation: boolean;
  missingPunchReminder: boolean;
  missingPunchReminderTime: string;
  // AT-28: 1Office's general attendance settings.
  lateEarlyUnit: "minute" | "second";
  overnightSplit: "none" | "split" | "split_full";
  continuousShiftMaxDays: number;
  shiftEditWindowDays: number | null;
  shiftCreateAheadDays: number | null;
};

// AT-23: one pass of missing-punch reminders for a work date.
export type ReminderRun = {
  workDate: string;
  trigger: "auto" | "manual";
  startedAt: string;
  finishedAt: string | null;
  notified: number;
  error: string | null;
};

export type ShiftSettingsData =
  | {
      source: "api";
      shifts: ShiftRecord[];
      policy: AttendancePolicy;
      departments: Array<{ id: string; name: string }>;
      positions: Array<{ id: string; name: string }>;
      locations: Array<{ id: string; name: string; kind: "gps" | "wifi" }>;
    }
  | { source: "unavailable"; error: string };

export function minuteToTime(minute: number | null | undefined) {
  if (minute == null) return "";
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function timeToMinute(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[1]) < 24 && Number(match[2]) < 60 ? minute : null;
}

export type HolidayType = "holiday" | "compensatory_workday" | "company_off";

export type HolidayRecord = {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  paid: boolean;
  note: string | null;
};

export type HolidayData = { source: "api"; year: number; holidays: HolidayRecord[] } | { source: "unavailable"; year: number; error: string };

// AT-07 schedule grid, as GET /shift-assignments returns it.
export type ScheduleSource = "assignment" | "department" | "company" | "none";

export type ScheduleCell = {
  date: string;
  shiftId: string | null;
  source: ScheduleSource;
  assignmentId: string | null;
  note: string | null;
};

export type ScheduleShift = {
  id: string;
  code: string;
  name: string;
  color: string | null;
  startMinute: number;
  endMinute: number;
  status: "active" | "archived";
};

export type ScheduleGrid = {
  from: string;
  to: string;
  shifts: ScheduleShift[];
  holidays: Array<{ date: string; name: string; type: HolidayType }>;
  employees: Array<{ id: string; code: string; fullName: string; department: { id: string; name: string }; days: ScheduleCell[] }>;
};

export type ScheduleData = { source: "api"; grid: ScheduleGrid } | { source: "unavailable"; from: string; to: string; error: string };

// Monday of the week holding `date` (YYYY-MM-DD), and date arithmetic on calendar dates.
export function addCalendarDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * 86_400_000).toISOString().slice(0, 10);
}

export function mondayOf(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addCalendarDays(date, weekday === 0 ? -6 : 1 - weekday);
}

// AT-08 repeating patterns and bulk scheduling.
export type ShiftPatternRecord = {
  id: string;
  name: string;
  // Shift id per day of the cycle; null = day off.
  days: Array<string | null>;
  description: string | null;
  status: "active" | "archived";
};

// AT-25: standard work units for a group of departments × positions.
export type StandardMode = "schedule" | "auto" | "fixed";

export type StandardRuleRecord = {
  id: string;
  name: string;
  departmentIds: string[];
  positionIds: string[];
  mode: StandardMode;
  fixedUnits: number | null;
  adjustUnits: number;
  effectiveFrom: string;
  note: string | null;
};

export type StandardRulePayload = Omit<StandardRuleRecord, "id">;

export type StandardWorkdayData =
  | { source: "api"; rules: StandardRuleRecord[]; departments: Array<{ id: string; name: string }>; positions: Array<{ id: string; name: string }>; lockedThrough: string | null }
  | { source: "unavailable"; error: string };

// Days in a YYYY-MM month minus its Sundays (1Office's TOTAL_DAY-TOTAL_SUNDAY).
export function daysWithoutSundays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  let sundays = 0;
  for (let day = 1; day <= days; day += 1) if (new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay() === 0) sundays += 1;
  return days - sundays;
}

export type ShiftPatternData = { source: "api"; patterns: ShiftPatternRecord[] } | { source: "unavailable"; error: string };

export type BulkAssignInput = {
  employeeIds: string[];
  departmentIds: string[];
  from: string;
  to: string;
  mode: "shift" | "pattern";
  shiftId?: string | null;
  weekdays?: number[];
  patternId?: string;
  overwrite: boolean;
};

export type BulkAssignSummary = {
  cells: number;
  create: number;
  overwrite: number;
  unchanged: number;
  employees: number;
  written: number;
  saved: boolean;
};

// First and last day of the month holding `date`.
export function monthRange(date: string) {
  const from = `${date.slice(0, 7)}-01`;
  const nextMonth = `${addCalendarDays(from, 31).slice(0, 7)}-01`;
  return { from, to: addCalendarDays(nextMonth, -1) };
}

// AT-12 recalculation jobs, as GET /attendance/recalculations returns them.
export type RecalcJobStatus = "queued" | "running" | "done" | "failed";

export type RecalcJob = {
  id: string;
  from: string;
  to: string;
  // null = everyone employed in the range.
  employees: number | null;
  reason: "manual" | "schedule" | "holiday" | "policy" | "shift" | "department_default" | "request";
  status: RecalcJobStatus;
  result: { days: number; changed: number; removed: number; skipped?: number } | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type RecalcData =
  | { source: "api"; jobs: RecalcJob[]; departments: Array<{ id: string; name: string }> }
  | { source: "unavailable"; error: string };
