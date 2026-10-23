"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import type { AttendanceDeviceRecord } from "@/lib/attendance-device-api";

// AT-19/20: machines and sync errors on "Công → Máy chấm công".

export type DeviceActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type DevicePayload = {
  deviceId?: string;
  deviceName: string;
  storeCode: string;
  workplaceId: string;
  note: string;
  status?: "active" | "inactive";
};

export type SyncErrorCandidate = { id: string; code: string; fullName: string; attendanceCode: string | null; department: string };

const PAGE = "/user/attendance/devices";

async function send<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<DeviceActionResult<T>> {
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
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ. Vui lòng thử lại sau." };
  }
}

function devicePayload(payload: DevicePayload) {
  return {
    ...(payload.deviceId !== undefined ? { deviceId: payload.deviceId.trim() } : {}),
    deviceName: payload.deviceName.trim() || null,
    storeCode: payload.storeCode.trim() || null,
    workplaceId: payload.workplaceId || null,
    note: payload.note.trim() || null,
    ...(payload.status ? { status: payload.status } : {})
  };
}

export async function createDeviceAction(payload: DevicePayload) {
  const result = await send<AttendanceDeviceRecord>("POST", "/attendance-devices", devicePayload(payload));
  if (result.ok) revalidatePath(PAGE);
  return result;
}

export async function updateDeviceAction(id: string, payload: DevicePayload) {
  const result = await send<AttendanceDeviceRecord>("PATCH", `/attendance-devices/${encodeURIComponent(id)}`, devicePayload({ ...payload, deviceId: undefined }));
  if (result.ok) revalidatePath(PAGE);
  return result;
}

export async function setDeviceStatusAction(id: string, status: "active" | "inactive") {
  const result = await send<AttendanceDeviceRecord>("PATCH", `/attendance-devices/${encodeURIComponent(id)}`, { status });
  if (result.ok) revalidatePath(PAGE);
  return result;
}

export async function deleteDeviceAction(id: string) {
  const result = await send<{ id: string; deleted: boolean }>("DELETE", `/attendance-devices/${encodeURIComponent(id)}`);
  if (result.ok) revalidatePath(PAGE);
  return result;
}

export async function searchSyncErrorCandidatesAction(q: string) {
  return send<SyncErrorCandidate[]>("GET", `/attendance/sync-errors/candidates?q=${encodeURIComponent(q.trim())}`);
}

export async function resolveSyncErrorAction(id: string, input: { action: "assign"; employeeId: string } | { action: "dismiss"; note: string }) {
  const body = input.action === "assign" ? input : { action: "dismiss", note: input.note.trim() || undefined };
  const result = await send<{ resolved: number; imported: number }>("POST", `/attendance/sync-errors/${encodeURIComponent(id)}/resolve`, body);
  if (result.ok) {
    revalidatePath(PAGE);
    revalidatePath("/user/attendance/timesheet");
  }
  return result;
}
