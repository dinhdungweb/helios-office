"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type SessionActionResult = { ok: true; message: string } | { ok: false; error: string };

async function send(path: string, method: "POST" | "DELETE") {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) throw new Error("Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.");

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(". ") : body?.message;
    throw new Error(response.status >= 500 || !message ? "Không thực hiện được lúc này. Vui lòng thử lại sau." : message);
  }
}

function failure(error: unknown): SessionActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "Không thực hiện được lúc này." };
}

// AU-16: sign out one of my other devices.
export async function revokeSessionAction(sessionId: string): Promise<SessionActionResult> {
  try {
    await send(`/auth/sessions/${encodeURIComponent(sessionId)}`, "DELETE");
    revalidatePath("/user/security");
    return { ok: true, message: "Đã đăng xuất phiên đó." };
  } catch (error) {
    return failure(error);
  }
}

// AU-17: admin signs an account out everywhere.
export async function forceLogoutAction(accountId: string): Promise<SessionActionResult> {
  try {
    await send(`/account-access/accounts/${encodeURIComponent(accountId)}/force-logout`, "POST");
    revalidatePath(`/admin/settings/accounts/${accountId}`);
    return { ok: true, message: "Đã đăng xuất tài khoản khỏi mọi thiết bị." };
  } catch (error) {
    return failure(error);
  }
}
