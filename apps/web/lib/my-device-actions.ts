"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import { DEVICE_COOKIE } from "@/lib/my-device";

// DV-05: register this browser for check-in, or withdraw a request.

export type MyDeviceActionResult = { ok: true } | { ok: false; error: string };

const FIVE_YEARS = 5 * 365 * 24 * 60 * 60;

async function send(method: "POST" | "DELETE", path: string, body?: unknown): Promise<MyDeviceActionResult> {
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
      const errorBody = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(errorBody?.message) ? errorBody.message.join(". ") : errorBody?.message;
      return { ok: false, error: response.status >= 500 || !message ? "Không thực hiện được. Vui lòng thử lại sau." : message };
    }
    revalidatePath("/user/attendance");
    return { ok: true };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ. Vui lòng thử lại sau." };
  }
}

// Gives this browser an id on first use and asks HR to approve it.
export async function registerThisDeviceAction(deviceName: string) {
  const jar = await cookies();
  let deviceId = jar.get(DEVICE_COOKIE)?.value;
  if (!deviceId) {
    deviceId = `web-${randomUUID()}`;
    jar.set(DEVICE_COOKIE, deviceId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: FIVE_YEARS });
  }
  return send("POST", "/device-auth/my-requests", { deviceId, deviceName: deviceName.trim() });
}

export async function withdrawDeviceAction(id: string) {
  return send("DELETE", `/device-auth/my-requests/${encodeURIComponent(id)}`);
}
