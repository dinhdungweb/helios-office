"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type EmployeeDirectoryFormState = {
  ok: boolean;
  error?: string;
};

const mutationError = "Không lưu được hồ sơ nhân sự. Hãy kiểm tra dữ liệu và thử lại.";

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== "none" ? trimmed : undefined;
}

function readNullableString(formData: FormData, key: string) {
  return readOptionalString(formData, key) ?? null;
}

function readRequiredString(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);

  if (!value) {
    throw new Error(`Missing ${key}`);
  }

  return value;
}

function readNullableNumber(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);
  return value ? Number(value) : null;
}

async function mutationJson(path: string, body: unknown) {
  const headers = new Headers({
    "Content-Type": "application/json"
  });
  const accessToken = await getSessionAccessToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Bạn cần đăng nhập bằng tài khoản admin để sửa hồ sơ nhân sự.");
    }

    if (response.status === 403) {
      throw new Error("Tài khoản hiện tại không có quyền sửa hồ sơ nhân sự.");
    }

    if (response.status === 409) {
      throw new Error("Mã nhân sự, mã chấm công hoặc tài khoản liên kết đã tồn tại.");
    }

    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json();
}

function revalidateEmployeeDirectory() {
  revalidatePath("/admin/hr/employees");
  revalidatePath("/hcns/employees");
  revalidatePath("/admin/settings/accounts");
  revalidatePath("/admin/settings/accounts/groups");
  revalidatePath("/admin/hr/employees/new");
  revalidatePath("/hcns/employees/new");
  revalidatePath("/apps/personnel-profile-profile");
  revalidatePath("/apps/personnel-profile-profile/add");
  revalidatePath("/personnel-profile-profile");
  revalidatePath("/personnel-profile-profile/add");
  revalidatePath("/user/profile");
}

export async function updateEmployeeDirectoryAction(
  _state: EmployeeDirectoryFormState,
  formData: FormData
): Promise<EmployeeDirectoryFormState> {
  try {
    const employeeId = readRequiredString(formData, "employeeId");
    const accountId = readNullableString(formData, "accountId");
    const currentAccountId = readNullableString(formData, "currentAccountId");
    const payload = {
      code: readRequiredString(formData, "code"),
      fullName: readRequiredString(formData, "fullName"),
      departmentId: readRequiredString(formData, "departmentId"),
      positionId: readNullableString(formData, "positionId"),
      jobTitleId: readNullableString(formData, "jobTitleId"),
      managerId: readNullableString(formData, "managerId"),
      status: readRequiredString(formData, "status"),
      employeeType: readNullableString(formData, "employeeType"),
      avatarUrl: readNullableString(formData, "avatarUrl"),
      startDate: readRequiredString(formData, "startDate"),
      officialStartDate: readNullableString(formData, "officialStartDate"),
      endDate: readNullableString(formData, "endDate"),
      attendanceCode: readNullableString(formData, "attendanceCode"),
      attendanceMode: readNullableString(formData, "attendanceMode"),
      payrollTemplate: readNullableString(formData, "payrollTemplate"),
      standardWorkdays: readNullableNumber(formData, "standardWorkdays")
    };

    await mutationJson(`/employees/${employeeId}`, payload);

    if (accountId !== currentAccountId) {
      await mutationJson(`/employees/${employeeId}/account`, { accountId });
    }

    revalidateEmployeeDirectory();

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : mutationError
    };
  }
}
