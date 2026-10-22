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
  status: "active" | "archived";
  usage: { departmentDefaults: number; companyDefault: boolean };
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
};

export type ShiftSettingsData =
  | { source: "api"; shifts: ShiftRecord[]; policy: AttendancePolicy }
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
