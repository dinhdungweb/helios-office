"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import type { AttendanceDayStatus } from "@/lib/attendance-api";

// AT-15: reading and changing one calculated day from the monthly timesheet.

export type AttendanceDayDetail = {
  id: string;
  employeeId: string;
  workDate: string;
  status: AttendanceDayStatus;
  checkIn: string | null;
  checkOut: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  workedMinutes: number;
  lateMinutes: number;
  earlyMinutes: number;
  outsideShiftMinutes: number;
  nightMinutes: number;
  workUnits: number;
  paidLeaveUnits: number;
  flags: string[];
  punchCount: number;
  lastChangeSource: string;
  calculatedAt: string;
  employee: { id: string; code: string; fullName: string; department: { id: string; name: string } };
  shift: { id: string; code: string; name: string; color: string | null; startMinute: number; endMinute: number; breakStartMinute: number | null; breakEndMinute: number | null } | null;
  punches: Array<{ punchTime: string; deviceId: string | null; verifyType: string | null; source: string; direction: string | null; clientDeviceName: string | null; locationName: string | null }>;
  adjustments: Array<{
    id: string;
    checkIn?: string | null;
    checkOut?: string | null;
    punchesSet: boolean;
    workUnits: number | null;
    status: AttendanceDayStatus | null;
    reason: string;
    createdAt: string;
    createdBy: string | null;
    revokedAt: string | null;
    revokedBy: string | null;
    active: boolean;
  }>;
};

export type AttendanceActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type AdjustAttendancePayload = {
  checkIn?: string | null;
  checkOut?: string | null;
  workUnits?: number | null;
  status?: AttendanceDayStatus | null;
  reason: string;
};

async function call<T>(path: string, method: "GET" | "PATCH" | "DELETE", body?: unknown): Promise<AttendanceActionResult<T>> {
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
      if (response.status === 403) return { ok: false, error: "Tài khoản của bạn không có quyền sửa công." };
      const errorBody = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(errorBody?.message) ? errorBody.message.join(". ") : errorBody?.message;
      return { ok: false, error: response.status >= 500 || !message ? "Không thực hiện được. Vui lòng thử lại sau." : message };
    }
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ. Vui lòng thử lại sau." };
  }
}

export async function loadAttendanceDayAction(id: string) {
  return call<AttendanceDayDetail>(`/attendance/${encodeURIComponent(id)}`, "GET");
}

export async function adjustAttendanceDayAction(id: string, payload: AdjustAttendancePayload) {
  const result = await call<AttendanceDayDetail>(`/attendance/${encodeURIComponent(id)}`, "PATCH", payload);
  if (result.ok) revalidatePath("/user/attendance/timesheet");
  return result;
}

export async function revokeAttendanceAdjustmentAction(id: string, reason: string) {
  const result = await call<AttendanceDayDetail>(`/attendance/${encodeURIComponent(id)}/adjustment`, "DELETE", { reason });
  if (result.ok) revalidatePath("/user/attendance/timesheet");
  return result;
}

// AT-17: lock and reopen a month.
async function post<T>(path: string, body: unknown): Promise<AttendanceActionResult<T>> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) return { ok: false, error: "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục." };
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

export async function lockPeriodAction(month: string, note: string) {
  const result = await post<unknown>(`/attendance/timesheets/${encodeURIComponent(month)}/lock`, { note: note.trim() || undefined });
  if (result.ok) revalidatePath("/user/attendance/timesheet");
  return result;
}

export async function unlockPeriodAction(month: string, reason: string) {
  const result = await post<unknown>(`/attendance/timesheets/${encodeURIComponent(month)}/unlock`, { reason: reason.trim() });
  if (result.ok) revalidatePath("/user/attendance/timesheet");
  return result;
}

// AT-24: employees answer on their month; HR opens confirmation and handles feedback.
export async function answerMyMonthAction(month: string, action: "confirm" | "feedback", feedback?: string) {
  const result = await post<unknown>(`/attendance/me/timesheet/${encodeURIComponent(month)}/confirm`, { action, feedback: feedback?.trim() || undefined });
  if (result.ok) {
    revalidatePath("/user/attendance");
    revalidatePath("/user");
  }
  return result;
}

export async function setConfirmationWindowAction(month: string, open: boolean) {
  const result = await post<unknown>(`/attendance/timesheets/${encodeURIComponent(month)}/confirmation`, { open });
  if (result.ok) revalidatePath("/user/attendance/timesheet");
  return result;
}

export async function resolveFeedbackAction(month: string, employeeId: string, resolution: string) {
  const result = await post<unknown>(`/attendance/timesheets/${encodeURIComponent(month)}/confirmations/${encodeURIComponent(employeeId)}/resolve`, { resolution: resolution.trim() });
  if (result.ok) revalidatePath("/user/attendance/timesheet");
  return result;
}
