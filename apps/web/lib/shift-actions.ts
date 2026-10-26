"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import { timeToMinute, type AttendancePolicy, type BulkAssignInput, type BulkAssignSummary, type RecalcJob, type StandardRulePayload } from "@/lib/shift-format";

export type ShiftActionResult = { ok: true } | { ok: false; error: string };
export type ShiftDataResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function send(path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<ShiftActionResult> {
  const result = await request(path, method, body);
  return result.ok ? { ok: true } : result;
}

async function request<T = unknown>(path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<ShiftDataResult<T>> {
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
    return { ok: true, data: (await response.json().catch(() => null)) as T };
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
      description: text(formData, "description") || null,
      // AT-29: detect from punches, for the ticked groups (none ticked = everyone).
      autoDetect: formData.get("autoDetect") === "on",
      applyDepartmentIds: formData.getAll("applyDepartmentIds").map(String),
      applyPositionIds: formData.getAll("applyPositionIds").map(String)
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

// AT-25: an empty id creates the rule.
export async function saveStandardRuleAction(ruleId: string, payload: StandardRulePayload) {
  const result = ruleId ? await send(`/standard-workday-rules/${encodeURIComponent(ruleId)}`, "PATCH", payload) : await send("/standard-workday-rules", "POST", payload);
  if (result.ok) revalidatePath("/admin/settings/standard-workdays");
  return result;
}

export async function deleteStandardRuleAction(ruleId: string) {
  const result = await send(`/standard-workday-rules/${encodeURIComponent(ruleId)}`, "DELETE");
  if (result.ok) revalidatePath("/admin/settings/standard-workdays");
  return result;
}

// AT-23: send missing-punch reminders now (yesterday by default).
export async function runMissingPunchReminderAction(date?: string) {
  const result = await request<{ workDate: string; notified: number; skipped?: string }>("/attendance/reminders/run", "POST", date ? { date } : {});
  if (result.ok) revalidatePath("/admin/settings/attendance-policy");
  return result;
}

export async function updateAttendancePolicyAction(policy: Partial<AttendancePolicy>) {
  // defaultShift is the API's read-only expansion of defaultShiftId.
  const payload: Partial<AttendancePolicy> = { ...policy };
  delete payload.defaultShift;
  return send("/attendance-policy", "PATCH", payload);
}

// AT-10: one form for create and edit; an empty holidayId means create.
export async function saveHolidayAction(_state: ShiftActionResult | null, formData: FormData): Promise<ShiftActionResult> {
  const type = text(formData, "type") || "holiday";
  const payload = {
    date: text(formData, "date"),
    name: text(formData, "name"),
    type,
    paid: formData.get("paid") === "on",
    note: text(formData, "note") || null
  };
  const holidayId = text(formData, "holidayId");
  const result = holidayId ? await send(`/holidays/${encodeURIComponent(holidayId)}`, "PATCH", payload) : await send("/holidays", "POST", payload);
  if (result.ok) revalidatePath("/admin/settings/holidays");
  return result;
}

export async function deleteHolidayAction(holidayId: string) {
  const result = await send(`/holidays/${encodeURIComponent(holidayId)}`, "DELETE");
  if (result.ok) revalidatePath("/admin/settings/holidays");
  return result;
}

export async function addFixedHolidaysAction(year: number) {
  const result = await send("/holidays/fixed", "POST", { year });
  if (result.ok) revalidatePath("/admin/settings/holidays");
  return result;
}

// AT-07 schedule edits from the HCNS schedule grid.
export async function assignShiftsAction(employeeIds: string[], dates: string[], shiftId: string | null) {
  const result = await send("/shift-assignments", "POST", { employeeIds, dates, shiftId });
  if (result.ok) revalidatePath("/user/attendance/shift-schedule");
  return result;
}

export async function clearAssignmentsAction(employeeIds: string[], dates: string[]) {
  const result = await send("/shift-assignments/clear", "POST", { employeeIds, dates });
  if (result.ok) revalidatePath("/user/attendance/shift-schedule");
  return result;
}

export async function setDepartmentDefaultShiftAction(departmentId: string, shiftId: string | null) {
  const result = await send(`/departments/${encodeURIComponent(departmentId)}/default-shift`, "PUT", { shiftId });
  if (result.ok) revalidatePath("/user/attendance/shift-schedule");
  return result;
}

// AT-08: patterns (one form for create and edit; an empty patternId means create) and bulk scheduling.
export async function saveShiftPatternAction(patternId: string, payload: { name: string; days: Array<string | null>; description: string | null }) {
  return patternId ? send(`/shift-patterns/${encodeURIComponent(patternId)}`, "PATCH", payload) : send("/shift-patterns", "POST", payload);
}

export async function deleteShiftPatternAction(patternId: string) {
  return send(`/shift-patterns/${encodeURIComponent(patternId)}`, "DELETE");
}

export async function bulkAssignAction(input: BulkAssignInput, preview: boolean) {
  const result = await request<BulkAssignSummary>("/shift-assignments/bulk", "POST", { ...input, preview });
  if (result.ok && !preview) revalidatePath("/user/attendance/shift-schedule");
  return result;
}

// AT-12: HR asks for a recalculation; small ones finish before this returns.
export async function recalculateAttendanceAction(input: { from: string; to: string; departmentIds: string[] }) {
  const result = await request<RecalcJob>("/attendance/recalculate", "POST", input);
  if (result.ok) revalidatePath("/admin/settings/attendance-recalc");
  return result;
}
