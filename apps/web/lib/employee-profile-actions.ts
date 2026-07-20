"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type EmployeeCreateFormState = {
  ok: boolean;
  error?: string;
  employeeId?: string;
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

async function readDocuments(formData: FormData) {
  const documents: Array<{
    fieldName: string;
    fileName: string;
    mimeType: string;
    size: number;
    contentBase64: string;
  }> = [];
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

    documents.push({
      fieldName,
      fileName: value.name,
      mimeType: value.type || "application/octet-stream",
      size: value.size,
      contentBase64: Buffer.from(await value.arrayBuffer()).toString("base64")
    });
  }

  return documents;
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

  try {
    const accessToken = await getSessionAccessToken();
    const headers = new Headers({
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
      documents: await readDocuments(formData),
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

  revalidatePath("/admin/settings/accounts");
  revalidatePath("/admin/hr/employees");
  revalidatePath("/admin/hr/employees/new");
  revalidatePath("/hcns/employees");
  revalidatePath("/hcns/employees/new");
  revalidatePath("/apps/personnel-profile-profile");
  revalidatePath("/apps/personnel-profile-profile/add");
  revalidatePath("/personnel-profile-profile");
  revalidatePath("/personnel-profile-profile/add");

  return { ok: true, employeeId: employee.id };
}
