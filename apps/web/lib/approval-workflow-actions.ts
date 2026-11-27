"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type ApprovalWorkflowFormState = { ok: boolean; error?: string; errors?: string[]; id?: string };

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function friendlyError(status: number) {
  if (status === 401) return "Bạn cần đăng nhập bằng tài khoản quản trị.";
  if (status === 403) return "Tài khoản hiện tại không có quyền quản lý quy trình duyệt.";
  if (status === 409) return "Quy trình đã có đơn sử dụng.";
  if (status === 400) return "Dữ liệu quy trình chưa hợp lệ hoặc mã quy trình đã tồn tại.";
  return "Không lưu được quy trình duyệt. Hãy thử lại.";
}

async function send(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<ApprovalWorkflowFormState> {
  const headers = new Headers(body !== undefined ? { "Content-Type": "application/json" } : {});
  const accessToken = await getSessionAccessToken();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, cache: "no-store" });
    if (!response.ok) {
      // The API explains what blocks a workflow (e.g. the diagram problems listed by validateFlow).
      const errorBody = (await response.json().catch(() => null)) as { message?: string | string[]; errors?: string[] } | null;
      const message = Array.isArray(errorBody?.message) ? errorBody.message.join(". ") : errorBody?.message;
      return { ok: false, error: message && response.status < 500 ? message : friendlyError(response.status), errors: errorBody?.errors };
    }
    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    revalidatePath("/admin/settings/approval-workflows");
    return { ok: true, id: data?.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Không kết nối được máy chủ." };
  }
}

// Reads the designer form into the API payload; shared by create and edit.
function readWorkflowForm(formData: FormData): { payload: Record<string, unknown> } | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const objectType = String(formData.get("objectType") ?? "").trim();
  const approvalType = String(formData.get("approvalType") ?? "").trim();
  const displayStatus = String(formData.get("displayStatus") ?? "").trim();
  const requestedStatus = formData.get("intent") === "draft" ? "draft" : displayStatus === "inactive" ? "archived" : displayStatus === "active" ? "active" : "";
  const rawFlowDefinition = String(formData.get("flowDefinition") ?? "").trim();
  if (name.length < 2) return { error: "Hãy nhập tên quy trình." };
  if (!objectType) return { error: "Hãy chọn đối tượng áp dụng." };
  if (!approvalType) return { error: "Hãy chọn loại quy trình." };
  if (!requestedStatus) return { error: "Hãy chọn trạng thái quy trình." };

  let flowDefinition: Record<string, unknown> = { nodes: [{ id: "start", type: "start", label: "Bắt đầu", x: 72, y: 160 }], edges: [] };
  if (rawFlowDefinition) {
    try {
      const parsed = JSON.parse(rawFlowDefinition) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { error: "Cấu trúc sơ đồ quy trình chưa hợp lệ." };
      flowDefinition = parsed as Record<string, unknown>;
    } catch {
      return { error: "Không đọc được cấu trúc sơ đồ quy trình." };
    }
  }

  return {
    payload: {
      code: String(formData.get("code") ?? "").trim() || undefined,
      name,
      status: requestedStatus,
      objectType,
      subObject: String(formData.get("subObject") ?? "").trim() || "all",
      versionMode: checked(formData, "versionMode"),
      approvalType,
      followerId: String(formData.get("followerId") ?? "") || undefined,
      showFlowInObject: checked(formData, "showFlowInObject"),
      allowAttachmentsAfterApproved: checked(formData, "allowAttachmentsAfterApproved"),
      allowDocumentChangesAfterApproved: checked(formData, "allowDocumentChangesAfterApproved"),
      allowDiscussionAfterApproved: checked(formData, "allowDiscussionAfterApproved"),
      overdueAction: String(formData.get("overdueAction") ?? "none"),
      flowDefinition
    }
  };
}

export async function createApprovalWorkflowAction(_state: ApprovalWorkflowFormState, formData: FormData): Promise<ApprovalWorkflowFormState> {
  const form = readWorkflowForm(formData);
  if ("error" in form) return { ok: false, error: form.error };
  return send("/approval-workflows", "POST", form.payload);
}

// AP-04: saving a changed diagram or settings makes a new version on the server.
export async function updateApprovalWorkflowAction(_state: ApprovalWorkflowFormState, formData: FormData): Promise<ApprovalWorkflowFormState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Thiếu mã quy trình." };
  const form = readWorkflowForm(formData);
  if ("error" in form) return { ok: false, error: form.error };
  const result = await send(`/approval-workflows/${encodeURIComponent(id)}`, "PATCH", { ...form.payload, followerId: form.payload.followerId ?? "" });
  revalidatePath(`/admin/settings/approval-workflows/${id}`);
  return result;
}

// AP-07 / AP-08.
export async function setApprovalWorkflowActiveAction(id: string, active: boolean) {
  return send(`/approval-workflows/${encodeURIComponent(id)}/${active ? "activate" : "deactivate"}`, "POST");
}

export async function duplicateApprovalWorkflowAction(id: string) {
  return send(`/approval-workflows/${encodeURIComponent(id)}/duplicate`, "POST");
}

export async function deleteApprovalWorkflowsAction(ids: string[]): Promise<ApprovalWorkflowFormState> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return { ok: false, error: "Chưa chọn quy trình cần xóa." };
  for (const id of uniqueIds) {
    const result = await send(`/approval-workflows/${encodeURIComponent(id)}`, "DELETE");
    if (!result.ok && !result.error?.includes("Không tìm thấy")) return result;
  }
  return { ok: true };
}
