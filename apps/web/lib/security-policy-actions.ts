"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

// Company-wide sign-in policies (AU-18 two-factor, AU-19 sessions), edited by admins.

export type TwoFactorPolicy = {
  enforced: boolean;
  verificationMinutes: number;
  payrollRequired: boolean;
  otpDigits: number;
  otpPeriodSeconds: number;
};

export type SessionPolicy = {
  autoLogoutEnabled: boolean;
  idleMinutes: number;
  warningSeconds: number;
  maxConcurrentSessions: number;
};

export type PolicyResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<PolicyResult<T>> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) return { ok: false, error: "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục." };

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
      cache: "no-store"
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(body?.message) ? body.message.join(". ") : body?.message;
      return {
        ok: false,
        error: response.status === 403 ? "Tài khoản hiện tại không có quyền quản trị hệ thống." : response.status >= 500 || !message ? "Không lưu được. Vui lòng thử lại sau." : message
      };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ. Vui lòng thử lại sau." };
  }
}

export async function getTwoFactorPolicy() {
  return request<TwoFactorPolicy>("/admin-settings/two-factor");
}

export async function getSessionPolicy() {
  return request<SessionPolicy>("/admin-settings/session");
}

export async function updateTwoFactorPolicyAction(policy: TwoFactorPolicy) {
  const result = await request<TwoFactorPolicy>("/admin-settings/two-factor", { method: "PATCH", body: JSON.stringify(policy) });
  if (result.ok) revalidatePath("/admin/settings/two-factor");
  return result;
}

export async function updateSessionPolicyAction(policy: SessionPolicy) {
  const result = await request<SessionPolicy>("/admin-settings/session", { method: "PATCH", body: JSON.stringify(policy) });
  if (result.ok) revalidatePath("/admin/settings/session");
  return result;
}
