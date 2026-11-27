"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import type { LeavePreview, LeaveRange, LeaveType, RequestDetail, RequestOptions } from "@/lib/request-format";

// Server actions of the "Đơn từ" module. Every result carries the API's own reason when it refuses.

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown): Promise<ActionResult<T>> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) return { ok: false, error: "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục." };
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });
    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(errorBody?.message) ? errorBody.message.join(". ") : errorBody?.message;
      if (response.status === 403 && !message) return { ok: false, error: "Tài khoản hiện tại không có quyền làm việc này." };
      return { ok: false, error: response.status >= 500 || !message ? "Không thực hiện được. Vui lòng thử lại sau." : message };
    }
    return { ok: true, data: (await response.json().catch(() => null)) as T };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ. Vui lòng thử lại sau." };
  }
}

function refresh(id?: string) {
  revalidatePath("/user/requests");
  if (id) revalidatePath("/user/requests/detail");
}

export type LeaveFormInput = { leaveTypeCode: string; ranges: LeaveRange[]; reason?: string };

export async function previewLeaveAction(input: LeaveFormInput & { requestId?: string }) {
  return call<LeavePreview>("/leave-requests/preview", "POST", input);
}

export async function saveLeaveRequestAction(input: { requestId?: string; version?: number; payload: LeaveFormInput; followerIds: string[]; submit: boolean }) {
  return saveRequestAction({ ...input, type: "leave" });
}

// Creates (or edits, then optionally submits) a request of any type; the API's handler checks the payload.
export async function saveRequestAction(input: { type: string; requestId?: string; version?: number; payload: object; followerIds: string[]; submit: boolean }) {
  if (input.requestId) {
    const updated = await call<RequestDetail>(`/requests/${input.requestId}`, "PATCH", { payload: input.payload, followerIds: input.followerIds, version: input.version });
    if (!updated.ok || !input.submit) {
      refresh(input.requestId);
      return updated;
    }
    const submitted = await call<RequestDetail>(`/requests/${input.requestId}/submit`, "POST");
    refresh(input.requestId);
    return submitted;
  }
  const created = await call<RequestDetail>("/requests", "POST", { type: input.type, payload: input.payload, followerIds: input.followerIds, submit: input.submit });
  refresh();
  return created;
}

// LV-18 → LV-20: my shift, holiday and recorded punches on a date, and the shifts I may change to.
export async function requestOptionsAction(date: string) {
  return call<RequestOptions>(`/attendance-requests/options?date=${encodeURIComponent(date)}`, "GET");
}

export async function submitRequestAction(id: string) {
  const result = await call<RequestDetail>(`/requests/${id}/submit`, "POST");
  refresh(id);
  return result;
}

export async function recallRequestAction(id: string) {
  const result = await call<RequestDetail>(`/requests/${id}/recall`, "POST");
  refresh(id);
  return result;
}

export async function cancelRequestAction(id: string, reason?: string) {
  const result = await call<RequestDetail>(`/requests/${id}/cancel`, "POST", { reason });
  refresh(id);
  return result;
}

export async function decideRequestAction(input: { stepId: string; action: "approve" | "reject" | "return"; reason?: string; version?: number; requestId: string }) {
  const result =
    input.action === "return"
      ? await call<RequestDetail>(`/approvals/${input.stepId}/return`, "POST", { reason: input.reason ?? "", version: input.version })
      : await call<RequestDetail>(`/approvals/${input.stepId}/decision`, "POST", { action: input.action, reason: input.reason, version: input.version });
  refresh(input.requestId);
  return result;
}

export async function commentRequestAction(id: string, body: string) {
  const result = await call(`/requests/${id}/comments`, "POST", { body });
  refresh(id);
  return result;
}

export async function adjustBalanceAction(input: { employeeId: string; leaveTypeId: string; year: number; amount: number; reason: string }) {
  const result = await call("/leave-balances/adjust", "POST", input);
  revalidatePath("/user/requests/settings/balances");
  return result;
}

export type LeaveTypeInput = Partial<Omit<LeaveType, "id" | "maxDaysPerRequest">> & { maxDaysPerRequest?: number | null };

export async function saveLeaveTypeAction(id: string | null, input: LeaveTypeInput) {
  const result = id ? await call<LeaveType>(`/leave-types/${id}`, "PATCH", input) : await call<LeaveType>("/leave-types", "POST", input);
  revalidatePath("/user/requests/settings/leave-types");
  return result;
}

export async function deleteLeaveTypeAction(id: string) {
  const result = await call(`/leave-types/${id}`, "DELETE");
  revalidatePath("/user/requests/settings/leave-types");
  return result;
}
