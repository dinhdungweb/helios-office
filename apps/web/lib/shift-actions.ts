"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import { timeToMinute, type AttendancePolicy } from "@/lib/shift-format";

export type ShiftActionResult = { ok: true } | { ok: false; error: string };

async function send(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<ShiftActionResult> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) return { ok: false, error: "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục." };

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });

    if (!response.ok) {
      if (response.status === 403) return { ok: false, error: "Tài khoản hiện tại không có quyền cài đặt chấm công." };
      const errorBody = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(errorBody?.message) ? errorBody.message.join(". ") : errorBody?.message;
      return { ok: false, error: response.status >= 500 || !message ? "Không lưu được. Vui lòng thử lại sau." : message };
    }

    revalidatePath("/admin/settings/shifts");
    revalidatePath("/admin/settings/attendance-policy");
    return { ok: true };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ. Vui lòng thử lại sau." };
  }
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalTime(formData: FormData, key: string, label: string) {
  const value = text(formData, key);
  if (!value) return null;
  const minute = timeToMinute(value);
  if (minute === null) throw new Error(`${label} phải có dạng HH:MM.`);
  return minute;
}

function optionalInt(formData: FormData, key: string) {
  const value = text(formData, key);
  return value === "" ? null : Number(value);
}

function optionalChoice<T extends string>(formData: FormData, key: string) {
  const value = text(formData, key);
  return value === "" ? null : (value as T);
}

// One form posts both create and edit; an empty shiftId means create.
export async function saveShiftAction(_state: ShiftActionResult | null, formData: FormData): Promise<ShiftActionResult> {
  try {
    const type = text(formData, "type") === "flexible" ? "flexible" : "fixed";
    const startMinute = optionalTime(formData, "start", "Giờ vào");
    const endMinute = optionalTime(formData, "end", "Giờ ra");
    if (startMinute === null || endMinute === null) throw new Error("Nhập giờ vào và giờ ra.");

    const requiredHours = text(formData, "requiredHours");
    const payload = {
      code: text(formData, "code"),
      name: text(formData, "name"),
      type,
      color: text(formData, "color") || null,
      startMinute,
      endMinute,
      breakStartMinute: optionalTime(formData, "breakStart", "Giờ bắt đầu nghỉ"),
      breakEndMinute: optionalTime(formData, "breakEnd", "Giờ kết thúc nghỉ"),
      requiredMinutes: type === "flexible" && requiredHours ? Math.round(Number(requiredHours) * 60) : null,
      workUnits: Number(text(formData, "workUnits") || "1"),
      lateGraceMinutes: optionalInt(formData, "lateGraceMinutes"),
      earlyGraceMinutes: optionalInt(formData, "earlyGraceMinutes"),
      lateCountMode: optionalChoice(formData, "lateCountMode"),
      missingPunchMode: optionalChoice(formData, "missingPunchMode"),
      description: text(formData, "description") || null
    };
    const shiftId = text(formData, "shiftId");

    return shiftId ? send(`/shifts/${encodeURIComponent(shiftId)}`, "PATCH", payload) : send("/shifts", "POST", payload);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Dữ liệu ca không hợp lệ." };
  }
}

export async function archiveShiftAction(shiftId: string) {
  return send(`/shifts/${encodeURIComponent(shiftId)}/archive`, "POST");
}

export async function restoreShiftAction(shiftId: string) {
  return send(`/shifts/${encodeURIComponent(shiftId)}/restore`, "POST");
}

export async function deleteShiftAction(shiftId: string) {
  return send(`/shifts/${encodeURIComponent(shiftId)}`, "DELETE");
}

export async function updateAttendancePolicyAction(policy: Partial<AttendancePolicy>) {
  // defaultShift is the API's read-only expansion of defaultShiftId.
  const payload: Partial<AttendancePolicy> = { ...policy };
  delete payload.defaultShift;
  return send("/attendance-policy", "PATCH", payload);
}
