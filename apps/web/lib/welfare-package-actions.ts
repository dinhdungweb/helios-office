"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type WelfarePackageFormState = { ok: boolean; error?: string };

function formStrings(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => typeof value === "string" ? value.trim() : "");
}

function parseAmount(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : 0;
}

function friendlyPackageError(status: number) {
  if (status === 401) return "Bạn cần đăng nhập bằng tài khoản admin để quản lý gói phúc lợi.";
  if (status === 403) return "Tài khoản hiện tại không có quyền quản lý gói phúc lợi.";
  if (status === 400) return "Dữ liệu gói phúc lợi chưa hợp lệ. Hãy kiểm tra ngày và danh mục áp dụng.";
  return "Không lưu được gói phúc lợi. Hãy kiểm tra dữ liệu và thử lại.";
}

export async function createWelfarePackageAction(
  _state: WelfarePackageFormState,
  formData: FormData
): Promise<WelfarePackageFormState> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 2) return { ok: false, error: "Hãy nhập tên gói phúc lợi." };

    const benefitIds = formStrings(formData, "benefitId");
    const amounts = formStrings(formData, "itemAmount");
    const paymentMethods = formStrings(formData, "paymentMethod");
    const rowCount = Math.max(benefitIds.length, amounts.length, paymentMethods.length, 1);
    const items = Array.from({ length: rowCount }, (_, index) => ({
      benefitId: benefitIds[index] || undefined,
      amount: parseAmount(amounts[index] ?? "0"),
      paymentMethod: paymentMethods[index] || undefined
    }));

    const payload = {
      name,
      startDate: String(formData.get("startDate") ?? "") || undefined,
      endDate: String(formData.get("endDate") ?? "") || undefined,
      positionId: String(formData.get("positionId") ?? "") || undefined,
      jobTitleId: String(formData.get("jobTitleId") ?? "") || undefined,
      jobLevelId: String(formData.get("jobLevelId") ?? "") || undefined,
      description: String(formData.get("description") ?? "").trim() || undefined,
      items
    };

    const accessToken = await getSessionAccessToken();
    const headers = new Headers({ "Content-Type": "application/json" });
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${getApiBaseUrl()}/welfare-packages`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    if (!response.ok) return { ok: false, error: friendlyPackageError(response.status) };

    revalidatePath("/admin/settings/welfare-packages");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Không tạo được gói phúc lợi." };
  }
}

export async function deleteWelfarePackagesAction(ids: string[]): Promise<WelfarePackageFormState> {
  try {
    const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) return { ok: false, error: "Chưa chọn gói phúc lợi cần xóa." };

    const accessToken = await getSessionAccessToken();
    const headers = new Headers();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    for (const id of uniqueIds) {
      const response = await fetch(`${getApiBaseUrl()}/welfare-packages/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
        cache: "no-store"
      });
      if (!response.ok && response.status !== 404) return { ok: false, error: friendlyPackageError(response.status) };
    }

    revalidatePath("/admin/settings/welfare-packages");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Không xóa được gói phúc lợi." };
  }
}
