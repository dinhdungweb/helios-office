"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

// Two-factor authentication (AU-18) for the signed-in user, plus the admin reset. Codes are only
// relayed to the API; nothing here logs or keeps them.

export type TwoFactorStatus = {
  policy: { enforced: boolean; verificationMinutes: number; otpDigits: number; otpPeriodSeconds: number };
  totp: { enrolled: boolean; digits: number; confirmedAt: string | null };
  email: { available: boolean; maskedAddress: string };
  session: { verified: boolean; verifiedAt: string | null };
};

export type TotpSetup = { secret: string; qrSvg: string; digits: number; periodSeconds: number };

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; code?: string };

const genericError = "Không thực hiện được lúc này. Vui lòng thử lại sau.";

async function call<T>(path: string, init: RequestInit = {}): Promise<ActionResult<T>> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) return { ok: false, error: "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.", code: "no_session" };

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
      cache: "no-store"
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string | string[]; code?: string } | null;
      const message = Array.isArray(body?.message) ? body.message.join(". ") : body?.message;
      return { ok: false, error: response.status >= 500 || !message ? genericError : message, code: body?.code };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: genericError };
  }
}

export async function getTwoFactorStatus() {
  return call<TwoFactorStatus>("/auth/two-factor");
}

export async function startTotpSetupAction(): Promise<ActionResult<TotpSetup>> {
  const result = await call<{ secret: string; otpauthUrl: string; digits: number; periodSeconds: number }>("/auth/two-factor/totp/setup", { method: "POST" });
  if (!result.ok) return result;

  const qrSvg = await QRCode.toString(result.data.otpauthUrl, { type: "svg", margin: 1, width: 200, errorCorrectionLevel: "M" });
  return { ok: true, data: { secret: result.data.secret, qrSvg, digits: result.data.digits, periodSeconds: result.data.periodSeconds } };
}

export async function confirmTotpAction(code: string) {
  const result = await call<{ ok: true }>("/auth/two-factor/totp/confirm", { method: "POST", body: JSON.stringify({ code: code.trim() }) });
  if (result.ok) revalidatePath("/user/security");
  return result;
}

export async function removeTotpAction() {
  const result = await call<{ ok: true }>("/auth/two-factor/totp", { method: "DELETE" });
  if (result.ok) revalidatePath("/user/security");
  return result;
}

export async function sendEmailCodeAction() {
  return call<{ sentTo: string; expiresInSeconds: number }>("/auth/two-factor/email/send", { method: "POST" });
}

export async function verifyTwoFactorAction(method: "totp" | "email", code: string) {
  return call<{ ok: true }>("/auth/two-factor/verify", { method: "POST", body: JSON.stringify({ method, code: code.trim() }) });
}

export async function resetAccountTwoFactorAction(accountId: string) {
  const result = await call<{ ok: true }>(`/account-access/accounts/${encodeURIComponent(accountId)}/two-factor/reset`, { method: "POST" });
  if (result.ok) revalidatePath(`/admin/settings/accounts/${accountId}`);
  return result;
}
