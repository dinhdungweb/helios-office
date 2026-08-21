"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type WelfareBenefitFormState = {
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

function friendlyBenefitError(status: number) {
  if (status === 401) return "Bạn cần đăng nhập bằng tài khoản admin để quản lý chế độ phúc lợi.";
  if (status === 403) return "Tài khoản hiện tại không có quyền quản lý chế độ phúc lợi.";
  return "Không lưu được chế độ phúc lợi. Hãy kiểm tra dữ liệu và thử lại.";
}

export async function createWelfareBenefitAction(
  _state: WelfareBenefitFormState,
  formData: FormData
): Promise<WelfareBenefitFormState> {
  try {
    const names = formStrings(formData, "name");
    const amounts = formStrings(formData, "amount");
    const descriptions = formStrings(formData, "description");
    const rows = names.map((name, index) => ({
      name,
      amount: parseAmount(amounts[index] ?? ""),
      description: descriptions[index] || undefined
    })).filter((row) => row.name.length > 0);

    if (rows.length === 0) return { ok: false, error: "Hãy nhập ít nhất một tên phúc lợi." };

    const accessToken = await getSessionAccessToken();
    const headers = new Headers({ "Content-Type": "application/json" });
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    for (const row of rows) {
      const response = await fetch(`${getApiBaseUrl()}/welfare-benefits`, {
        method: "POST",
        headers,
        body: JSON.stringify(row),
        cache: "no-store"
      });

      if (!response.ok) return { ok: false, error: friendlyBenefitError(response.status) };
    }

    revalidatePath("/admin/settings/welfare-benefits");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không tạo được chế độ phúc lợi."
    };
  }
}

export async function deleteWelfareBenefitsAction(ids: string[]): Promise<WelfareBenefitFormState> {
  try {
    const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) return { ok: false, error: "Chưa chọn chế độ phúc lợi cần xóa." };

    const accessToken = await getSessionAccessToken();
    const headers = new Headers();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    for (const id of uniqueIds) {
      const response = await fetch(`${getApiBaseUrl()}/welfare-benefits/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
        cache: "no-store"
      });

      if (!response.ok && response.status !== 404) {
        return { ok: false, error: friendlyBenefitError(response.status) };
      }
    }

    revalidatePath("/admin/settings/welfare-benefits");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không xóa được chế độ phúc lợi."
    };
  }
}
