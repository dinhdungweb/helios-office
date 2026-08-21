"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type InternalPenaltyFormState = {
  ok: boolean;
  error?: string;
};

function formStrings(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => typeof value === "string" ? value.trim() : "");
}

function parseAmount(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : 0;
}

function friendlyPenaltyError(status: number) {
  if (status === 401) return "Bạn cần đăng nhập bằng tài khoản admin để quản lý phạt nội bộ.";
  if (status === 403) return "Tài khoản hiện tại không có quyền quản lý phạt nội bộ.";
  return "Không lưu được phạt nội bộ. Hãy kiểm tra dữ liệu và thử lại.";
}

export async function createInternalPenaltyAction(
  _state: InternalPenaltyFormState,
  formData: FormData
): Promise<InternalPenaltyFormState> {
  try {
    const violations = formStrings(formData, "violation");
    const amounts = formStrings(formData, "amount");
    const descriptions = formStrings(formData, "description");
    const rows = violations.map((violation, index) => ({
      violation,
      amount: parseAmount(amounts[index] ?? ""),
      description: descriptions[index] || undefined
    })).filter((row) => row.violation.length > 0);

    if (rows.length === 0) return { ok: false, error: "Hãy nhập ít nhất một lỗi vi phạm." };

    const accessToken = await getSessionAccessToken();
    const headers = new Headers({ "Content-Type": "application/json" });
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    for (const row of rows) {
      const response = await fetch(`${getApiBaseUrl()}/internal-penalties`, {
        method: "POST",
        headers,
        body: JSON.stringify(row),
        cache: "no-store"
      });

      if (!response.ok) return { ok: false, error: friendlyPenaltyError(response.status) };
    }

    revalidatePath("/admin/settings/internal-penalties");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không tạo được phạt nội bộ."
    };
  }
}

export async function deleteInternalPenaltiesAction(ids: string[]): Promise<InternalPenaltyFormState> {
  try {
    const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) return { ok: false, error: "Chưa chọn phạt nội bộ cần xóa." };

    const accessToken = await getSessionAccessToken();
    const headers = new Headers();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    for (const id of uniqueIds) {
      const response = await fetch(`${getApiBaseUrl()}/internal-penalties/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
        cache: "no-store"
      });

      if (!response.ok && response.status !== 404) {
        return { ok: false, error: friendlyPenaltyError(response.status) };
      }
    }

    revalidatePath("/admin/settings/internal-penalties");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không xóa được phạt nội bộ."
    };
  }
}
