import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import type { AttendancePolicy, HolidayData, HolidayRecord, ScheduleData, ScheduleGrid, ShiftRecord, ShiftSettingsData } from "@/lib/shift-format";

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
    return { source: "unavailable", from, to, error: error instanceof Error ? error.message : "Không tải được lịch ca." };
  }
}
