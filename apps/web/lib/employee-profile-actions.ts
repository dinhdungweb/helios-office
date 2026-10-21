"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type EmployeeCreateFormState = {
  ok: boolean;
  error?: string;
  employeeId?: string;
  // Set when the profile was created but some attachments could not be uploaded.
  warning?: string;
};

const employeeCoreFields = new Set([
  "code", "fullName", "title", "positionId", "jobTitleId", "departmentId", "managerId",
  "startDate", "status", "employeeType", "officialStartDate", "avatarUrl", "attendanceCode",
  "attendanceMode", "payrollTemplate", "standardWorkdays", "createAccount", "username",
  "initialPassword", "requirePasswordChange", "adminRole", "accountStatus",
  "permissionGroupId", "sendInviteEmail"
]);

function readProfileData(formData: FormData) {
  const profileData: Record<string, string | string[] | boolean> = {};

  for (const [key, rawValue] of formData.entries()) {
    if (key.startsWith("$ACTION_") || employeeCoreFields.has(key) || typeof rawValue !== "string") continue;
    const value = rawValue.trim();
    if (!value || value === "none") continue;

    const current = profileData[key];
    profileData[key] = current === undefined
      ? value
      : Array.isArray(current)
        ? [...current, value]
        : typeof current === "string"
          ? [current, value]
          : value;
  }

  for (let index = 1; index <= 21; index += 1) {
    const key = `onboardingItem${index}`;
    profileData[key] = formData.has(key);
  }

  profileData.isDigitalContract = formData.has("isDigitalContract");
  return profileData;
}

type PendingDocument = { fieldName: string; file: File };

function readDocuments(formData: FormData) {
  const documents: PendingDocument[] = [];
  let totalSize = 0;

  for (const [fieldName, value] of formData.entries()) {
    if (typeof value === "string" || value.size === 0) continue;
    if (value.size > 5 * 1024 * 1024) {
      throw new Error(`Tệp ${value.name} vượt quá giới hạn 5 MB.`);
    }
    totalSize += value.size;
    if (totalSize > 20 * 1024 * 1024) {
      throw new Error("Tổng dung lượng tệp đính kèm vượt quá giới hạn 20 MB.");
    }

    documents.push({ fieldName, file: value });
  }

  return documents;
}

// Uploads each attachment straight to object storage (presign → PUT → complete) and attaches it to
// the new profile; the API never receives the bytes. Returns the names of files that failed.
async function uploadDocuments(employeeId: string, documents: PendingDocument[], headers: Headers) {
  const apiBase = getApiBaseUrl();
  const failed: string[] = [];

  for (const { fieldName, file } of documents) {
    try {
      const presign = await fetch(`${apiBase}/files/presign`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          purpose: "employee_document",
          ownerId: employeeId
        }),
        cache: "no-store"
      });
      if (!presign.ok) throw new Error(`presign ${presign.status}`);
      const upload = (await presign.json()) as { file: { id: string }; uploadUrl: string; headers: Record<string, string> };

      const stored = await fetch(upload.uploadUrl, { method: "PUT", headers: upload.headers, body: Buffer.from(await file.arrayBuffer()) });
      if (!stored.ok) throw new Error(`storage ${stored.status}`);

      const completed = await fetch(`${apiBase}/files/${upload.file.id}/complete`, { method: "POST", headers, cache: "no-store" });
      if (!completed.ok) throw new Error(`complete ${completed.status}`);

      const attached = await fetch(`${apiBase}/employees/${employeeId}/documents`, {
        method: "POST",
        headers,
        body: JSON.stringify({ fileId: upload.file.id, fieldName }),
        cache: "no-store"
      });
      if (!attached.ok) throw new Error(`attach ${attached.status}`);
    } catch {
      failed.push(file.name);
    }
  }

  return failed;
}

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

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function readNumber(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);
  return value ? Number(value) : undefined;
}

function friendlyMutationError(status: number) {
  if (status === 401) {
    return "Bạn cần đăng nhập bằng tài khoản admin để tạo hồ sơ nhân sự.";
  }

  if (status === 403) {
    return "Tài khoản hiện tại không có quyền tạo hồ sơ nhân sự.";
  }

  if (status === 409) {
    return "Mã nhân sự hoặc email tài khoản đã tồn tại.";
  }

  return "Không tạo được hồ sơ nhân sự. Hãy kiểm tra dữ liệu và thử lại.";
}

export async function createEmployeeProfileAction(
  _state: EmployeeCreateFormState,
  formData: FormData
): Promise<EmployeeCreateFormState> {
  const createAccount = readBoolean(formData, "createAccount");
  let response: Response;
  let headers: Headers;
  let documents: PendingDocument[];

  try {
    const accessToken = await getSessionAccessToken();
    documents = readDocuments(formData);
    headers = new Headers({
      "Content-Type": "application/json"
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const payload = {
      code: readRequiredString(formData, "code"),
      fullName: readRequiredString(formData, "fullName"),
      title: readOptionalString(formData, "title"),
      positionId: readRequiredString(formData, "positionId"),
      jobTitleId: readRequiredString(formData, "jobTitleId"),
      departmentId: readRequiredString(formData, "departmentId"),
      managerId: readOptionalString(formData, "managerId"),
      startDate: readRequiredString(formData, "startDate"),
      status: readRequiredString(formData, "status"),
      employeeType: readOptionalString(formData, "employeeType"),
      officialStartDate: readOptionalString(formData, "officialStartDate"),
      avatarUrl: readOptionalString(formData, "avatarUrl"),
      attendanceCode: readOptionalString(formData, "attendanceCode"),
      attendanceMode: readOptionalString(formData, "attendanceMode"),
      payrollTemplate: readOptionalString(formData, "payrollTemplate"),
      standardWorkdays: readNumber(formData, "standardWorkdays"),
      profileData: readProfileData(formData),
      contract: readOptionalString(formData, "contractType") && readOptionalString(formData, "contractStartDate")
        ? {
            type: readRequiredString(formData, "contractType"),
            startDate: readRequiredString(formData, "contractStartDate"),
            endDate: readOptionalString(formData, "contractEndDate")
          }
        : undefined,
      createAccount,
      account: createAccount
        ? {
            username: readRequiredString(formData, "username"),
            initialPassword: readOptionalString(formData, "initialPassword"),
            requirePasswordChange: readBoolean(formData, "requirePasswordChange"),
            email: readRequiredString(formData, "email"),
            phone: readOptionalString(formData, "phone"),
            adminRole: readRequiredString(formData, "adminRole"),
            accountStatus: readRequiredString(formData, "accountStatus"),
            permissionGroupId: readOptionalString(formData, "permissionGroupId"),
            sendInviteEmail: readBoolean(formData, "sendInviteEmail")
          }
        : undefined
    };

    response = await fetch(`${getApiBaseUrl()}/employees`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store"
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không tạo được hồ sơ nhân sự."
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: friendlyMutationError(response.status)
    };
  }

  const employee = (await response.json()) as { id?: string };
  // The profile exists now; an attachment that fails is reported, not treated as a failed create.
  const failedUploads = employee.id && documents.length ? await uploadDocuments(employee.id, documents, headers) : [];

  revalidatePath("/admin/settings/accounts");
  revalidatePath("/hcns/employees");
  revalidatePath("/hcns/employees/new");
  revalidatePath("/apps/personnel-profile-profile");
  revalidatePath("/apps/personnel-profile-profile/add");
  revalidatePath("/personnel-profile-profile");
  revalidatePath("/personnel-profile-profile/add");

  return {
    ok: true,
    employeeId: employee.id,
    warning: failedUploads.length
      ? `Đã tạo hồ sơ, nhưng chưa tải lên được: ${failedUploads.join(", ")}. Kiểm tra định dạng (PDF, Word, Excel, ảnh) và thử lại trong hồ sơ.`
      : undefined
  };
}
