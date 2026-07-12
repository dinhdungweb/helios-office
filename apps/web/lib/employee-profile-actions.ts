"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type EmployeeCreateFormState = {
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

  revalidatePath("/admin/settings/accounts");
  revalidatePath("/admin/hr/employees");
  revalidatePath("/admin/hr/employees/new");
  revalidatePath("/hcns/employees");
  revalidatePath("/hcns/employees/new");

  return { ok: true };
}
