"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type DepartmentFormState = {
  ok: boolean;
  error?: string;
};

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== "none" ? trimmed : undefined;
}

function readRequiredString(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);

  if (!value) {
    throw new Error(`Missing ${key}`);
  }

  return value;
}

function friendlyDepartmentError(status: number) {
  if (status === 401) {
    return "Bạn cần đăng nhập bằng tài khoản admin để quản lý phòng ban.";
  }

  if (status === 403) {
    return "Tài khoản hiện tại không có quyền quản lý phòng ban.";
  }

  if (status === 404) {
    return "Không tìm thấy phòng ban hoặc nhân sự được chọn.";
  }

  if (status === 409) {
    return "Không thể lưu phòng ban: tên đã tồn tại, cấp cha không hợp lệ hoặc phòng ban còn dữ liệu liên kết.";
  }

  return "Không lưu được phòng ban. Hãy kiểm tra dữ liệu và thử lại.";
}

async function mutateDepartment(path: string, method: "POST" | "PATCH", payload?: Record<string, unknown>) {
  const accessToken = await getSessionAccessToken();
  const headers = new Headers();

  if (payload) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    return {
      ok: false,
      error: friendlyDepartmentError(response.status)
    };
  }

  revalidatePath("/admin/settings/org-chart");
  revalidatePath("/admin/hr/employees/new");

  return { ok: true };
}

export async function createDepartmentAction(
  _state: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  try {
    return mutateDepartment("/departments", "POST", {
      name: readRequiredString(formData, "name"),
      parentId: readOptionalString(formData, "parentId"),
      headId: readOptionalString(formData, "headId")
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không tạo được phòng ban."
    };
  }
}

export async function updateDepartmentAction(
  _state: DepartmentFormState,
  formData: FormData
): Promise<DepartmentFormState> {
  try {
    const id = readRequiredString(formData, "id");

    return mutateDepartment(`/departments/${encodeURIComponent(id)}`, "PATCH", {
      name: readRequiredString(formData, "name"),
      parentId: readOptionalString(formData, "parentId"),
      headId: readOptionalString(formData, "headId")
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không cập nhật được phòng ban."
    };
  }
}

export async function archiveDepartmentAction(formData: FormData) {
  const id = readRequiredString(formData, "id");
  await mutateDepartment(`/departments/${encodeURIComponent(id)}/archive`, "POST");
}

export async function restoreDepartmentAction(formData: FormData) {
  const id = readRequiredString(formData, "id");
  await mutateDepartment(`/departments/${encodeURIComponent(id)}/restore`, "POST");
}
