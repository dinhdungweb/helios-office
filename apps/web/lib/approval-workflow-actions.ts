"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type ApprovalWorkflowFormState = { ok: boolean; error?: string };

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function friendlyError(status: number) {
  if (status === 401) return "Bạn cần đăng nhập bằng tài khoản quản trị.";
  if (status === 403) return "Tài khoản hiện tại không có quyền quản lý quy trình duyệt.";
  if (status === 400) return "Dữ liệu quy trình chưa hợp lệ hoặc mã quy trình đã tồn tại.";
  return "Không lưu được quy trình duyệt. Hãy thử lại.";
}

export async function createApprovalWorkflowAction(
  _state: ApprovalWorkflowFormState,
  formData: FormData
): Promise<ApprovalWorkflowFormState> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    const objectType = String(formData.get("objectType") ?? "").trim();
    const approvalType = String(formData.get("approvalType") ?? "").trim();
    const rawFlowDefinition = String(formData.get("flowDefinition") ?? "").trim();
    if (name.length < 2) return { ok: false, error: "Hãy nhập tên quy trình." };
    if (!objectType) return { ok: false, error: "Hãy chọn đối tượng áp dụng." };
    if (!approvalType) return { ok: false, error: "Hãy chọn loại quy trình." };

    let flowDefinition: Record<string, unknown> = {
      nodes: [{ id: "start", type: "start", label: "Bắt đầu", x: 72, y: 160 }],
      edges: []
    };
    if (rawFlowDefinition) {
      try {
        const parsedFlowDefinition = JSON.parse(rawFlowDefinition) as unknown;
        if (!parsedFlowDefinition || typeof parsedFlowDefinition !== "object" || Array.isArray(parsedFlowDefinition)) {
          return { ok: false, error: "Cấu trúc sơ đồ quy trình chưa hợp lệ." };
        }
        flowDefinition = parsedFlowDefinition as Record<string, unknown>;
      } catch {
        return { ok: false, error: "Không đọc được cấu trúc sơ đồ quy trình." };
      }
    }

    const payload = {
      code: String(formData.get("code") ?? "").trim() || undefined,
      name,
      status: formData.get("intent") === "draft"
        ? "draft"
        : formData.get("displayStatus") === "draft" ? "draft" : "active",
      objectType,
      subObject: String(formData.get("subObject") ?? "").trim() || undefined,
      versionMode: checked(formData, "versionMode"),
      approvalType,
      followerId: String(formData.get("followerId") ?? "") || undefined,
      showFlowInObject: checked(formData, "showFlowInObject"),
      allowAttachmentsAfterApproved: checked(formData, "allowAttachmentsAfterApproved"),
      allowDocumentChangesAfterApproved: checked(formData, "allowDocumentChangesAfterApproved"),
      allowDiscussionAfterApproved: checked(formData, "allowDiscussionAfterApproved"),
      overdueAction: String(formData.get("overdueAction") ?? "none"),
      flowDefinition
    };

    const headers = new Headers({ "Content-Type": "application/json" });
    const accessToken = await getSessionAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    const response = await fetch(`${getApiBaseUrl()}/approval-workflows`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    if (!response.ok) return { ok: false, error: friendlyError(response.status) };
    revalidatePath("/admin/settings/approval-workflows");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Không tạo được quy trình duyệt." };
  }
}

export async function deleteApprovalWorkflowsAction(ids: string[]): Promise<ApprovalWorkflowFormState> {
  try {
    const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) return { ok: false, error: "Chưa chọn quy trình cần xóa." };
    const headers = new Headers();
    const accessToken = await getSessionAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    for (const id of uniqueIds) {
      const response = await fetch(`${getApiBaseUrl()}/approval-workflows/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
        cache: "no-store"
      });
      if (!response.ok && response.status !== 404) return { ok: false, error: friendlyError(response.status) };
    }
    revalidatePath("/admin/settings/approval-workflows");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Không xóa được quy trình duyệt." };
  }
}
