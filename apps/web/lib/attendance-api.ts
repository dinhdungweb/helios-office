import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

// AT-03: one calculated attendance day (engine result), as GET /attendance/me returns it.
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
  // A full day of approved leave (AT-22).
  | "leave";

export type AttendanceDayResult = {
  id: string;
  workDate: string;
  shiftId: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  checkIn: string | null;
  checkOut: string | null;
  workedMinutes: number;
  lateMinutes: number;
  earlyMinutes: number;
  outsideShiftMinutes: number;
  nightMinutes: number;
  workUnits: number;
  paidLeaveUnits: number;
  status: AttendanceDayStatus;
  flags: string[];
  holidayType: "holiday" | "compensatory_workday" | "company_off" | null;
  punchCount: number;
  lastChangeSource: "punch_sync" | "recalculation" | "manual" | string;
  calculatedAt: string;
};

export type AttendanceData = {
  days: AttendanceDayResult[];
  source: "api" | "unavailable";
  error?: string;
};

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

// `month` is YYYY-MM.
export async function getMyAttendanceData(month: string): Promise<AttendanceData> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    return { days: [], source: "unavailable", error: "Phiên đăng nhập không hợp lệ." };
  }

  const { from, to } = monthBounds(month);
  try {
    const response = await fetch(`${getApiBaseUrl()}/attendance/me?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Attendance API returned ${response.status}`);
    }

    return { days: (await response.json()) as AttendanceDayResult[], source: "api" };
  } catch {
    return { days: [], source: "unavailable", error: "Không tải được dữ liệu chấm công. Thử tải lại trang." };
  }
}

// AT-09: my shift for each date of a month, as GET /shift-assignments/me returns it.
export type MyScheduleShift = {
  id: string;
  code: string;
  name: string;
  type: "fixed" | "flexible";
  color: string | null;
  startMinute: number;
  endMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
  requiredMinutes: number;
  workUnits: number;
};

export type MyScheduleDay = {
  date: string;
  employed: boolean;
  source: "assignment" | "department" | "company" | "none";
  note: string | null;
  holiday: { name: string; type: "holiday" | "compensatory_workday" | "company_off"; paid: boolean } | null;
  shift: MyScheduleShift | null;
};

export type MyScheduleData =
  | { source: "api"; month: string; days: MyScheduleDay[] }
  | { source: "unavailable"; month: string; error: string };

// `month` is YYYY-MM.
export async function getMyShiftSchedule(month: string): Promise<MyScheduleData> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) return { source: "unavailable", month, error: "Phiên đăng nhập không hợp lệ." };

  const { from, to } = monthBounds(month);
  try {
    const response = await fetch(`${getApiBaseUrl()}/shift-assignments/me?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    });
    if (response.status === 404) {
      return { source: "unavailable", month, error: "Tài khoản của bạn chưa gắn với hồ sơ nhân sự nên chưa có lịch ca." };
    }
    if (!response.ok) throw new Error(`Shift schedule API returned ${response.status}`);
    const body = (await response.json()) as { days: MyScheduleDay[] };
    return { source: "api", month, days: body.days };
  } catch {
    return { source: "unavailable", month, error: "Không tải được lịch ca. Thử tải lại trang." };
  }
}

// The requested month (YYYY-MM) or the current month in Vietnam.
export function resolveAttendanceMonth(requested: string | undefined) {
  if (requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested)) return requested;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).format(new Date());
}

// AT-24: my answer on a month and whether HR has opened confirmation.
export type AttendanceConfirmation = {
  status: "confirmed" | "feedback";
  feedback: string | null;
  respondedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
};

export type MyMonthConfirmation = {
  month: string;
  locked: boolean;
  confirmationOpen: boolean;
  confirmation: AttendanceConfirmation | null;
  // AT-25: the group's standard; null when it follows the shift schedule.
  standard?: MonthStandard | null;
};

export type MonthStandard = { units: number; hours: number; rule: string | null };

export async function getMyMonthConfirmation(month: string): Promise<MyMonthConfirmation | null> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) return null;
  try {
    const response = await fetch(`${getApiBaseUrl()}/attendance/me/timesheet?month=${month}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    });
    return response.ok ? ((await response.json()) as MyMonthConfirmation) : null;
  } catch {
    return null;
  }
}
