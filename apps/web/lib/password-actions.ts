"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

// Password changes (AU-13), forgot password (AU-14) and admin resets (AU-15). Keycloak keeps the
// passwords; these actions only relay them to the API and never log or return what was typed.

export type PasswordFormState = {
  ok: boolean;
  error?: string;
  message?: string;
  // Set only when the API generated a temporary password; shown once to the admin.
  temporaryPassword?: string;
};

const PASSWORD_MIN_LENGTH = 8;
const genericError = "Không thực hiện được lúc này. Vui lòng thử lại sau.";

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function postJson<T>(path: string, body: unknown, options: { withSession?: boolean } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });

  if (options.withSession) {
    const accessToken = await getSessionAccessToken();
    if (!accessToken) throw new Error("Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.");
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store" });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Thao tác quá nhiều lần. Đợi một phút rồi thử lại.");
    const errorBody = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(errorBody?.message) ? errorBody.message.join(". ") : errorBody?.message;
    throw new Error(response.status >= 500 ? genericError : message || genericError);
  }

  return response.json() as Promise<T>;
}

function readNewPassword(formData: FormData) {
  const newPassword = field(formData, "newPassword");

  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Mật khẩu mới cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`);
  }

  if (newPassword !== field(formData, "confirmPassword")) {
    throw new Error("Nhập lại mật khẩu mới chưa khớp.");
  }

  return newPassword;
}

function failure(error: unknown): PasswordFormState {
  return { ok: false, error: error instanceof Error ? error.message : genericError };
}

export async function changeOwnPasswordAction(_state: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  try {
    await postJson("/auth/change-password", {
      currentPassword: field(formData, "currentPassword"),
      newPassword: readNewPassword(formData)
    }, { withSession: true });

    return { ok: true, message: "Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới." };
  } catch (error) {
    return failure(error);
  }
}

export async function changeTemporaryPasswordAction(_state: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  try {
    await postJson("/auth/change-temporary-password", {
      username: field(formData, "username").trim(),
      currentPassword: field(formData, "currentPassword"),
      newPassword: readNewPassword(formData)
    });

    return { ok: true, message: "Đã đổi mật khẩu. Đăng nhập bằng mật khẩu mới." };
  } catch (error) {
    return failure(error);
  }
}

export async function forgotPasswordAction(_state: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const login = field(formData, "login").trim();

  if (!login) {
    return { ok: false, error: "Nhập tên đăng nhập hoặc email." };
  }

  try {
    await postJson("/auth/forgot-password", { login });
    return {
      ok: true,
      message: "Nếu thông tin khớp với một tài khoản đang hoạt động, hệ thống đã gửi email hướng dẫn đặt lại mật khẩu. Kiểm tra hộp thư (cả mục Spam) trong vài phút tới."
    };
  } catch (error) {
    return failure(error);
  }
}

export async function resetAccountPasswordAction(_state: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  try {
    const accountId = field(formData, "accountId");
    const method = field(formData, "method") === "email" ? "email" : "temporary_password";
    const typed = field(formData, "temporaryPassword");

    if (method === "temporary_password" && typed && typed.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`Mật khẩu tạm cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự, hoặc để trống để hệ thống tự tạo.`);
    }

    const result = await postJson<{ emailSentTo?: string; temporaryPassword?: string }>(
      `/account-access/accounts/${encodeURIComponent(accountId)}/reset-password`,
      {
        method,
        ...(method === "temporary_password" && typed ? { temporaryPassword: typed } : {}),
        signOutSessions: formData.get("signOutSessions") === "on"
      },
      { withSession: true }
    );
    revalidatePath(`/admin/settings/accounts/${accountId}`);

    return {
      ok: true,
      message: method === "email"
        ? `Đã gửi email đặt lại mật khẩu tới ${result.emailSentTo ?? "người dùng"}.`
        : "Đã đặt mật khẩu tạm. Người dùng phải đổi mật khẩu ở lần đăng nhập tới.",
      temporaryPassword: result.temporaryPassword
    };
  } catch (error) {
    return failure(error);
  }
}
