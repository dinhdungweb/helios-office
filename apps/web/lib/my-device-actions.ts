"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import { getCurrentSessionUser } from "@/lib/auth-user";
import { DEVICE_COOKIE, type MyPunch } from "@/lib/my-device";
import { getServerEnv } from "@/lib/server-env";

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

// AT-13: check in or out from this browser. The API only sees this web server, so the browser's
// address and agent go along, vouched for with WEB_SERVICE_TOKEN; the device id comes from the
// httpOnly cookie, never from the page.
export type CheckInPosition = { latitude: number; longitude: number; accuracy: number } | null;

export type CheckInResult =
  | { ok: true; duplicate: boolean; punch: MyPunch; punches: MyPunch[] }
  | { ok: false; reason: string | null; error: string };

// AT-14: a check-in photo, as a JPEG data URL from the camera, goes straight to storage
// (presign → PUT → complete) and only its id travels with the punch.
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

async function uploadCheckInPhoto(accessToken: string, dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("photo format");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) throw new Error("photo size");
  const employeeId = (await getCurrentSessionUser())?.account?.employeeId;
  if (!employeeId) throw new Error("no employee");

  const api = getApiBaseUrl();
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const presign = await fetch(`${api}/files/presign`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fileName: `checkin-${Date.now()}.${match[1].split("/")[1].replace("jpeg", "jpg")}`, mimeType: match[1], size: bytes.length, purpose: "checkin_photo", ownerId: employeeId }),
    cache: "no-store"
  });
  if (!presign.ok) throw new Error(`presign ${presign.status}`);
  const upload = (await presign.json()) as { file: { id: string }; uploadUrl: string; headers: Record<string, string> };
  const stored = await fetch(upload.uploadUrl, { method: "PUT", headers: upload.headers, body: bytes });
  if (!stored.ok) throw new Error(`storage ${stored.status}`);
  const completed = await fetch(`${api}/files/${upload.file.id}/complete`, { method: "POST", headers, cache: "no-store" });
  if (!completed.ok) throw new Error(`complete ${completed.status}`);
  return upload.file.id;
}

export async function checkInAction(direction: "in" | "out", position: CheckInPosition, photo?: string): Promise<CheckInResult> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) return { ok: false, reason: null, error: "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục." };
  let photoFileId: string | undefined;
  if (photo) {
    try {
      photoFileId = await uploadCheckInPhoto(accessToken, photo);
    } catch {
      return { ok: false, reason: "photo_upload", error: "Không tải được ảnh lên. Kiểm tra mạng rồi chụp lại." };
    }
  }
  const incoming = await headers();
  const clientIp = incoming.get("x-forwarded-for")?.split(",")[0]?.trim() || incoming.get("x-real-ip")?.trim() || "";
  const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value;
  try {
    const response = await fetch(`${getApiBaseUrl()}/attendance/${direction === "in" ? "check-in" : "check-out"}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-helios-service-token": getServerEnv("WEB_SERVICE_TOKEN") ?? "",
        "x-helios-client-ip": clientIp,
        "x-helios-client-agent": incoming.get("user-agent")?.slice(0, 300) ?? ""
      },
      body: JSON.stringify({ deviceId, photoFileId, ...(position ? { latitude: position.latitude, longitude: position.longitude, accuracy: Math.round(position.accuracy) } : {}) }),
      cache: "no-store"
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string | string[]; reason?: string } | null;
      const message = Array.isArray(body?.message) ? body.message.join(". ") : body?.message;
      return { ok: false, reason: body?.reason ?? null, error: response.status >= 500 || !message ? "Không chấm công được. Vui lòng thử lại sau." : message };
    }
    const result = (await response.json()) as { duplicate: boolean; punch: MyPunch; punches: MyPunch[] };
    revalidatePath("/user/attendance");
    return { ok: true, ...result };
  } catch {
    return { ok: false, reason: null, error: "Không kết nối được máy chủ. Vui lòng thử lại sau." };
  }
}
