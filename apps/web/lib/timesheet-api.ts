import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import type { AttendanceDayStatus } from "@/lib/attendance-api";

// Monthly timesheet (AT-16) as GET /attendance/timesheets returns it.

export type TimesheetCell = {
  date: string;
  id: string | null;
  status: AttendanceDayStatus | null;
  shiftCode: string | null;
  shiftColor: string | null;
  checkIn: string | null;
  checkOut: string | null;
  workedMinutes: number;
  workUnits: number;
  paidLeaveUnits: number;
  lateMinutes: number;
  earlyMinutes: number;
  outsideShiftMinutes: number;
  adjusted: boolean;
  needsExplanation: boolean;
};

export type TimesheetTotals = {
  lateCount: number;
  lateMinutes: number;
  earlyCount: number;
  earlyMinutes: number;
  missingPunchCount: number;
  absentDays: number;
  shiftUnits: number;
  holidayUnits: number;
  nightHours: number;
  outsideHours: number;
  standardUnits: number;
  standardHours: number;
  workedHours: number;
  totalUnits: number;
  workingDays: number;
};

export type TimesheetRow = {
  employee: { id: string; code: string; fullName: string; department: { id: string; name: string } };
  cells: TimesheetCell[];
  totals: TimesheetTotals;
};

export type Timesheet = {
  month: string;
  from: string;
  to: string;
  today: string;
  dates: Array<{ date: string; weekday: number; holiday: { name: string; type: string } | null }>;
  items: TimesheetRow[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export type TimesheetData =
  | { source: "api"; sheet: Timesheet; departments: Array<{ id: string; name: string }> }
  | { source: "unavailable"; error: string };

async function requestJson<T>(path: string) {
  const accessToken = await getSessionAccessToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getTimesheetData(input: { month: string; departmentId?: string; q?: string; page?: number }): Promise<TimesheetData> {
  const params = new URLSearchParams({ month: input.month, limit: "50", page: String(input.page ?? 1) });
  if (input.departmentId) params.set("departmentId", input.departmentId);
  if (input.q) params.set("q", input.q);
  try {
    const [sheet, departments] = await Promise.all([
      requestJson<Timesheet>(`/attendance/timesheets?${params.toString()}`),
      requestJson<Array<{ id: string; name: string }>>("/departments").catch(() => [])
    ]);
    return {
      source: "api",
      sheet,
      departments: departments.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "vi"))
    };
  } catch (error) {
    const forbidden = error instanceof Error && error.message.endsWith("returned 403");
    return { source: "unavailable", error: forbidden ? "Tài khoản của bạn không có quyền xem bảng chấm công." : "Không tải được bảng chấm công. Thử tải lại trang." };
  }
}
