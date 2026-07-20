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
