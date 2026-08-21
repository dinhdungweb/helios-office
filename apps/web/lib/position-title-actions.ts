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

function readEntryString(entry: FormDataEntryValue | undefined) {
  if (typeof entry !== "string") return undefined;

  const value = entry.trim();
  return value.length > 0 && value !== "none" ? value : undefined;
}

function createGeneratedTitleCode(name: string, index: number) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24)
    .toUpperCase() || "CHUC-VU";
  const suffix = Date.now().toString(36).slice(-6).toUpperCase();

  return `${slug}-${suffix}-${index + 1}`;
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
    return "Không thể thực hiện: mã hoặc tên đã tồn tại, hoặc danh mục đang có nhân sự sử dụng.";
  }

  return "Không lưu được danh mục. Hãy kiểm tra dữ liệu và thử lại.";
}

async function mutateCatalog(path: string, method: "POST" | "PATCH" | "DELETE", payload?: Record<string, unknown>) {
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

  revalidatePath("/admin/settings/job-positions");
  revalidatePath("/admin/settings/job-titles");
  revalidatePath("/admin/settings/job-levels");
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
    const names = formData.getAll("name");
    const codes = formData.getAll("code");
    const levelIds = formData.getAll("levelId");
    const descriptions = formData.getAll("description");

    if (names.length === 0) throw new Error("Missing name");

    for (let index = 0; index < names.length; index += 1) {
      const name = readEntryString(names[index]);
      if (!name) throw new Error(`Missing name at row ${index + 1}`);

      const code = readEntryString(codes[index]) ?? createGeneratedTitleCode(name, index);
      const result = await mutateCatalog("/job-titles", "POST", {
        code,
        name,
        levelId: readEntryString(levelIds[index]),
        description: readEntryString(descriptions[index])
      });

      if (!result.ok) return result;
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không tạo được chức danh."
    };
  }
}

export async function deleteCatalogItemsAction(
  kind: "position" | "title" | "level",
  ids: string[]
): Promise<CatalogFormState> {
  try {
    const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) return { ok: false, error: "Chưa chọn bản ghi cần xóa." };

    const resource = kind === "position" ? "job-positions" : kind === "title" ? "job-titles" : "job-levels";
    for (const id of uniqueIds) {
      const result = await mutateCatalog(`/${resource}/${encodeURIComponent(id)}`, "DELETE");
      if (!result.ok) return result;
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không xóa được danh mục."
    };
  }
}

export async function createJobLevelAction(_state: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  try {
    const names = formData.getAll("name");
    const descriptions = formData.getAll("description");

    if (names.length === 0) throw new Error("Missing name");

    for (let index = 0; index < names.length; index += 1) {
      const name = readEntryString(names[index]);
      if (!name) throw new Error(`Missing name at row ${index + 1}`);

      const result = await mutateCatalog("/job-levels", "POST", {
        name,
        description: readEntryString(descriptions[index]),
        sortOrder: index + 1
      });

      if (!result.ok) return result;
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không tạo được cấp bậc."
    };
  }
}

export async function updateTitleAction(_state: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  try {
    const id = readRequiredString(formData, "id");

    return mutateCatalog(`/job-titles/${encodeURIComponent(id)}`, "PATCH", {
      code: readRequiredString(formData, "code"),
      name: readRequiredString(formData, "name"),
      levelId: readOptionalString(formData, "levelId") ?? null,
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
