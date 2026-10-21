import { getApiBaseUrl } from "@/lib/api-base";
import { getKeycloakLogoutUrl, type WebAuthConfig } from "@/lib/auth-config";

// A Keycloak login is only half of signing in: the user also needs an active Helios account
// (AU-24). Login, the OAuth callback and token refresh call this before keeping a session.

export type HeliosAccountCheck = "ok" | "account_not_linked" | "account_inactive" | "unknown";

const REFUSED: ReadonlySet<HeliosAccountCheck> = new Set(["account_not_linked", "account_inactive"]);

export function isRefusedAccount(check: HeliosAccountCheck): check is "account_not_linked" | "account_inactive" {
  return REFUSED.has(check);
}

// "unknown" when the API cannot answer (down, timeout, unexpected status): the login goes ahead,
// since the API still checks the account on every request.
export async function checkHeliosAccount(accessToken: string): Promise<HeliosAccountCheck> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000)
    });

    if (response.ok) return "ok";
    if (response.status !== 401) return "unknown";

    const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
    return body?.code === "account_not_linked" || body?.code === "account_inactive" ? body.code : "unknown";
  } catch {
    return "unknown";
  }
}

// Ends the Keycloak session server-side, so SSO does not silently sign the same user back in when
// they press "Đăng nhập" again (and they can switch to another account). Best effort.
export async function endKeycloakSession(config: WebAuthConfig, refreshToken: string | undefined) {
  if (!refreshToken) return;

  const body = new URLSearchParams({ client_id: config.clientId, refresh_token: refreshToken });
  if (config.clientSecret) body.set("client_secret", config.clientSecret);

  try {
    await fetch(getKeycloakLogoutUrl(config), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(5_000)
    });
  } catch {
    // The refresh token expires on its own; the user simply sees the login page.
  }
}
