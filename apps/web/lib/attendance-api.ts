import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  source: string;
  status: "valid" | "late" | "early_leave" | "missing_checkout" | "needs_review";
};

export type AttendanceData = {
  records: AttendanceRecord[];
  source: "api" | "unavailable";
  error?: string;
};

export async function getMyAttendanceData(): Promise<AttendanceData> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    return { records: [], source: "unavailable", error: "Phiên đăng nhập không hợp lệ." };
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/attendance/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Attendance API returned ${response.status}`);
    }

    return {
      records: await response.json() as AttendanceRecord[],
      source: "api"
    };
  } catch (error) {
    return {
      records: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Không thể tải dữ liệu chấm công."
    };
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

  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  try {
    const response = await fetch(`${getApiBaseUrl()}/shift-assignments/me?from=${month}-01&to=${month}-${String(lastDay).padStart(2, "0")}`, {
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
