"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import type { AttendanceLocationType } from "@/lib/attendance-location-api";

// DV-07: add, change and remove valid check-in places.

export type LocationActionResult = { ok: true } | { ok: false; error: string };

export type LocationPayload = {
  name: string;
  type: AttendanceLocationType;
  workplaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  ssid: string | null;
  bssid: string | null;
  ipRanges: string[];
  status: "active" | "inactive";
  note: string | null;
};

const PAGE = "/user/attendance/settings/locations";

async function send(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<LocationActionResult> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) return { ok: false, error: "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục." };
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store"
    });
    if (!response.ok) {
      if (response.status === 403) return { ok: false, error: "Tài khoản của bạn không có quyền thực hiện thao tác này." };
      const errorBody = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(errorBody?.message) ? errorBody.message.join(". ") : errorBody?.message;
      return { ok: false, error: response.status >= 500 || !message ? "Không thực hiện được. Vui lòng thử lại sau." : message };
    }
    revalidatePath(PAGE);
    return { ok: true };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ. Vui lòng thử lại sau." };
  }
}

export async function saveLocationAction(id: string, payload: LocationPayload) {
  return id ? send("PATCH", `/attendance-locations/${encodeURIComponent(id)}`, payload) : send("POST", "/attendance-locations", payload);
}

export async function deleteLocationAction(id: string) {
  return send("DELETE", `/attendance-locations/${encodeURIComponent(id)}`);
}
