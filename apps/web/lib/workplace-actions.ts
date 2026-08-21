"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type WorkplaceFormState = {
  ok: boolean;
  error?: string;
};

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readRequiredString(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function friendlyWorkplaceError(status: number) {
  if (status === 401) return "Bạn cần đăng nhập bằng tài khoản admin để quản lý nơi làm việc.";
  if (status === 403) return "Tài khoản hiện tại không có quyền quản lý nơi làm việc.";
  if (status === 409) return "Tên nơi làm việc đã tồn tại.";
  return "Không lưu được nơi làm việc. Hãy kiểm tra dữ liệu và thử lại.";
}

export async function createWorkplaceAction(
  _state: WorkplaceFormState,
  formData: FormData
): Promise<WorkplaceFormState> {
  try {
    const accessToken = await getSessionAccessToken();
    const headers = new Headers({ "Content-Type": "application/json" });
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${getApiBaseUrl()}/workplaces`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: readRequiredString(formData, "name"),
        addressLine: readOptionalString(formData, "addressLine"),
        administrativeArea: readOptionalString(formData, "administrativeArea"),
        departmentId: readOptionalString(formData, "departmentId"),
        description: readOptionalString(formData, "description")
      }),
      cache: "no-store"
    });

    if (!response.ok) return { ok: false, error: friendlyWorkplaceError(response.status) };

    revalidatePath("/admin/settings/workplaces");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không tạo được nơi làm việc."
    };
  }
}

export async function deleteWorkplacesAction(ids: string[]): Promise<WorkplaceFormState> {
  try {
    const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) return { ok: false, error: "Chưa chọn nơi làm việc cần xóa." };

    const accessToken = await getSessionAccessToken();
    const headers = new Headers();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    for (const id of uniqueIds) {
      const response = await fetch(`${getApiBaseUrl()}/workplaces/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
        cache: "no-store"
      });

      if (!response.ok && response.status !== 404) {
        return { ok: false, error: friendlyWorkplaceError(response.status) };
      }
    }

    revalidatePath("/admin/settings/workplaces");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không xóa được nơi làm việc."
    };
  }
}
