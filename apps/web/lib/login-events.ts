import type { NextRequest } from "next/server";
import { getApiBaseUrl } from "@/lib/api-base";
import { getServerEnv } from "@/lib/server-env";

// Login history (AU-20). Keycloak only ever sees this web server, so the login routes report each
// attempt to the API with the browser's own IP and user agent. Best effort: a missing token or an
// API outage never blocks or delays a sign-in by more than the timeout.

export type LoginOutcome =
  | "success"
  | "invalid_credentials"
  | "password_update_required"
  | "account_not_linked"
  | "account_inactive";

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || undefined;
}

// preferred_username of an access token, for sign-ins that did not go through the login form.
export function usernameFromToken(accessToken: string) {
  try {
    const payload = accessToken.split(".")[1] ?? "";
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { preferred_username?: unknown; email?: unknown };
    const name = claims.preferred_username ?? claims.email;
    return typeof name === "string" && name ? name : "unknown";
  } catch {
    return "unknown";
  }
}

export async function recordLoginEvent(
  request: NextRequest,
  event: { username: string; outcome: LoginOutcome; accessToken?: string }
) {
  const serviceToken = getServerEnv("WEB_SERVICE_TOKEN");
  if (!serviceToken || !event.username) return;

  try {
    await fetch(`${getApiBaseUrl()}/auth/login-events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        username: event.username.slice(0, 254),
        outcome: event.outcome,
        accessToken: event.accessToken,
        ipAddress: clientIp(request)?.slice(0, 64),
        userAgent: request.headers.get("user-agent")?.slice(0, 1000) ?? undefined
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000)
    });
  } catch {
    // History is lost for this attempt; the sign-in itself goes on.
  }
}
