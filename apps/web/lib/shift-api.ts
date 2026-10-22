import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import type {
  AttendancePolicy,
  HolidayData,
  HolidayRecord,
  RecalcData,
  RecalcJob,
  ScheduleData,
  ScheduleGrid,
  ShiftPatternData,
  ShiftPatternRecord,
  ShiftRecord,
  ShiftSettingsData
} from "@/lib/shift-format";

// Server-side loading of the shift catalogue and attendance policy (AT-05, AT-06). Client
// components import types and HH:MM helpers from shift-format.ts instead.

async function requestJson<T>(path: string) {
  const accessToken = await getSessionAccessToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getShiftSettingsData(): Promise<ShiftSettingsData> {
  try {
    const [shifts, policy] = await Promise.all([
      requestJson<ShiftRecord[]>("/shifts?includeArchived=true"),
      requestJson<AttendancePolicy>("/attendance-policy")
    ]);
    return { source: "api", shifts, policy };
  } catch (error) {
    return { source: "unavailable", error: error instanceof Error ? error.message : "Không tải được dữ liệu ca." };
  }
}

export async function getHolidayData(year: number): Promise<HolidayData> {
  try {
    return { source: "api", year, holidays: await requestJson<HolidayRecord[]>(`/holidays?year=${year}`) };
  } catch (error) {
    return { source: "unavailable", year, error: error instanceof Error ? error.message : "Không tải được lịch nghỉ lễ." };
  }
}

export async function getScheduleData(from: string, to: string): Promise<ScheduleData> {
  try {
    return { source: "api", grid: await requestJson<ScheduleGrid>(`/shift-assignments?from=${from}&to=${to}`) };
  } catch (error) {
    const forbidden = error instanceof Error && error.message.endsWith("returned 403");
    return {
      source: "unavailable",
      from,
      to,
      error: forbidden
        ? "Tài khoản của bạn chưa có quyền xem lịch ca. Liên hệ HR hoặc quản trị viên nếu bạn cần xếp ca cho phòng ban."
        : "Không tải được lịch ca. Thử tải lại trang hoặc liên hệ quản trị viên."
    };
  }
}

export async function getShiftPatterns(): Promise<ShiftPatternData> {
  try {
    return { source: "api", patterns: await requestJson<ShiftPatternRecord[]>("/shift-patterns") };
  } catch (error) {
    return { source: "unavailable", error: error instanceof Error ? error.message : "Không tải được mẫu xếp ca." };
  }
}

export async function getRecalcData(): Promise<RecalcData> {
  try {
    const [jobs, departments] = await Promise.all([
      requestJson<RecalcJob[]>("/attendance/recalculations?limit=30"),
      requestJson<Array<{ id: string; name: string; status?: string }>>("/departments")
    ]);
    return { source: "api", jobs, departments: departments.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "vi")) };
  } catch (error) {
    const forbidden = error instanceof Error && error.message.endsWith("returned 403");
    return { source: "unavailable", error: forbidden ? "Tài khoản của bạn không có quyền tính lại công." : "Không tải được dữ liệu tính lại công." };
  }
}
