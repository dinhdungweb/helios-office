"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type CatalogFormState = {
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

function readOptionalNumber(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);
  return value ? Number(value) : undefined;
}

function friendlyCatalogError(status: number) {
  if (status === 401) {
    return "Bạn cần đăng nhập bằng tài khoản admin để quản lý danh mục nhân sự.";
  }

  if (status === 403) {
    return "Tài khoản hiện tại không có quyền quản lý danh mục nhân sự.";
  }

  if (status === 404) {
    return "Không tìm thấy danh mục được chọn.";
  }

  if (status === 409) {
    return "Không thể lưu danh mục: mã hoặc tên đã tồn tại, hoặc danh mục đang có nhân sự sử dụng.";
  }

  return "Không lưu được danh mục. Hãy kiểm tra dữ liệu và thử lại.";
}

async function mutateCatalog(path: string, method: "POST" | "PATCH", payload?: Record<string, unknown>) {
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
      error: friendlyCatalogError(response.status)
    };
  }

  revalidatePath("/admin/settings/positions-titles");
  revalidatePath("/admin/hr/employees/new");

  return { ok: true };
}

export async function createPositionAction(_state: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  try {
    return mutateCatalog("/job-positions", "POST", {
      code: readRequiredString(formData, "code"),
      name: readRequiredString(formData, "name"),
      family: readOptionalString(formData, "family"),
      description: readOptionalString(formData, "description")
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không tạo được vị trí."
    };
  }
}

export async function updatePositionAction(_state: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  try {
    const id = readRequiredString(formData, "id");

    return mutateCatalog(`/job-positions/${encodeURIComponent(id)}`, "PATCH", {
      code: readRequiredString(formData, "code"),
      name: readRequiredString(formData, "name"),
      family: readOptionalString(formData, "family") ?? null,
      description: readOptionalString(formData, "description") ?? null
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không cập nhật được vị trí."
    };
  }
}

export async function archivePositionAction(formData: FormData) {
  const id = readRequiredString(formData, "id");
  await mutateCatalog(`/job-positions/${encodeURIComponent(id)}/archive`, "POST");
}

export async function restorePositionAction(formData: FormData) {
  const id = readRequiredString(formData, "id");
  await mutateCatalog(`/job-positions/${encodeURIComponent(id)}/restore`, "POST");
}

export async function createTitleAction(_state: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  try {
    return mutateCatalog("/job-titles", "POST", {
      code: readRequiredString(formData, "code"),
      name: readRequiredString(formData, "name"),
      rank: readOptionalNumber(formData, "rank"),
      description: readOptionalString(formData, "description")
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không tạo được chức danh."
    };
  }
}

export async function updateTitleAction(_state: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  try {
    const id = readRequiredString(formData, "id");

    return mutateCatalog(`/job-titles/${encodeURIComponent(id)}`, "PATCH", {
      code: readRequiredString(formData, "code"),
      name: readRequiredString(formData, "name"),
      rank: readOptionalNumber(formData, "rank") ?? 0,
      description: readOptionalString(formData, "description") ?? null
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không cập nhật được chức danh."
    };
  }
}

export async function archiveTitleAction(formData: FormData) {
  const id = readRequiredString(formData, "id");
  await mutateCatalog(`/job-titles/${encodeURIComponent(id)}/archive`, "POST");
}

export async function restoreTitleAction(formData: FormData) {
  const id = readRequiredString(formData, "id");
  await mutateCatalog(`/job-titles/${encodeURIComponent(id)}/restore`, "POST");
}
