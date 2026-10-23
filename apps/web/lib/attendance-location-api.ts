import { headers } from "next/headers";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

// Valid check-in places (DV-07), read on the server for Cài đặt → Chấm công GPS/Wifi.

export type AttendanceLocationType = "gps" | "wifi" | "ip";

export type AttendanceLocationRecord = {
  id: string;
  name: string;
  type: AttendanceLocationType;
  workplaceId: string | null;
  workplace: { id: string; name: string } | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  ssid: string | null;
  bssid: string | null;
  ipRanges: string[];
  status: "active" | "inactive";
  note: string | null;
};

export type AttendanceLocationData =
  | { source: "api"; locations: AttendanceLocationRecord[]; workplaces: Array<{ id: string; name: string }>; myIp: string | null }
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

// The browser's address as this web server sees it, offered as a one-click IP range.
async function viewerIp() {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || list.get("x-real-ip")?.trim() || null;
  return ip ? ip.replace(/^::ffff:/i, "") : null;
}

export async function getAttendanceLocationData(): Promise<AttendanceLocationData> {
  try {
    const [locations, workplaces, myIp] = await Promise.all([
      requestJson<AttendanceLocationRecord[]>("/attendance-locations"),
      requestJson<Array<{ id: string; name: string; status?: string }>>("/workplaces").catch(() => []),
      viewerIp()
    ]);
    return {
      source: "api",
      locations,
      workplaces: workplaces.filter((item) => item.status !== "archived").map(({ id, name }) => ({ id, name })),
      myIp
    };
  } catch (error) {
    const forbidden = error instanceof Error && error.message.endsWith("returned 403");
    return { source: "unavailable", error: forbidden ? "Tài khoản của bạn không có quyền quản lý điểm chấm công." : "Không tải được điểm chấm công. Thử tải lại trang." };
  }
}
