import { cookies, headers } from "next/headers";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

// DV-05: this browser as a check-in device. Its id lives in an httpOnly cookie, so page scripts
// cannot read or copy it; the server sends it to the API with each device call.

export const DEVICE_COOKIE = "helios_device_id";

export type MyDeviceStatus = "pending" | "approved" | "rejected" | "locked";

export type MyDevice = {
  id: string;
  deviceId: string;
  deviceName: string;
  status: MyDeviceStatus;
  submittedAt: string;
  lastUsedAt: string | null;
  note: string | null;
  current: boolean;
};

// AT-13: what check-in needs (DV-06) and my punches today.
export type CheckInRules = { requireApprovedDevice: boolean; requireGps: boolean; requireOfficeNetwork: boolean };

export type MyPunch = { id: string; punchTime: string; source: "machine" | "web" | "app"; direction: "in" | "out" | null; place: string | null; device: string | null };

export type MyDeviceData =
  | { source: "api"; maxDevices: number; devices: MyDevice[]; current: MyDevice | null; suggestedName: string; rules: CheckInRules; punches: MyPunch[] }
  | { source: "unavailable"; error: string };

export async function readDeviceId() {
  return (await cookies()).get(DEVICE_COOKIE)?.value ?? null;
}

// "Chrome · Windows" from the user agent, as a starting name the employee can change.
export function deviceNameFrom(userAgent: string) {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /coc_coc_browser/i.test(userAgent)
      ? "Cốc Cốc"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Trình duyệt";
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /iPhone|iPad/.test(userAgent)
      ? "iOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}

export async function getMyDeviceData(): Promise<MyDeviceData> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) return { source: "unavailable", error: "Phiên đăng nhập không hợp lệ." };
  const deviceId = await readDeviceId();
  try {
    const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : "";
    const auth = { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" as const };
    const [response, punchResponse] = await Promise.all([
      fetch(`${getApiBaseUrl()}/device-auth/my-devices${query}`, auth),
      fetch(`${getApiBaseUrl()}/attendance/me/punches`, auth)
    ]);
    if (response.status === 404) return { source: "unavailable", error: "Tài khoản của bạn chưa gắn với hồ sơ nhân sự." };
    if (!response.ok) throw new Error(`my-devices returned ${response.status}`);
    const data = (await response.json()) as { maxDevices: number; devices: MyDevice[]; rules: CheckInRules };
    const today = punchResponse.ok ? ((await punchResponse.json()) as { punches: MyPunch[] }) : { punches: [] };
    return {
      source: "api",
      maxDevices: data.maxDevices,
      devices: data.devices,
      current: data.devices.find((device) => device.current) ?? null,
      suggestedName: deviceNameFrom((await headers()).get("user-agent") ?? ""),
      rules: data.rules,
      punches: today.punches
    };
  } catch {
    return { source: "unavailable", error: "Không tải được thiết bị chấm công." };
  }
}
