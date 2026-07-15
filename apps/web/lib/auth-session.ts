import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/server-env";

export const AUTH_COOKIE_NAMES = {
  accessToken: "helios_access_token",
  refreshToken: "helios_refresh_token",
  idToken: "helios_id_token",
  authState: "helios_auth_state",
  pkceVerifier: "helios_pkce_verifier",
  redirectTo: "helios_auth_redirect"
} as const;

export type KeycloakTokenSet = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  id_token?: string;
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  };
}

function normalizeIssuer(value: string) {
  return value.replace(/\/+$/, "");
}

function getTokenUrl(issuerOverride?: string) {
  const issuer = issuerOverride ?? getServerEnv("KEYCLOAK_ISSUER");

  if (!issuer) {
    throw new Error("KEYCLOAK_ISSUER is not configured");
  }

  return new URL(`${normalizeIssuer(issuer)}/protocol/openid-connect/token`);
}

function getClientId() {
  const clientId = getServerEnv("KEYCLOAK_CLIENT_ID");

  if (!clientId) {
    throw new Error("KEYCLOAK_CLIENT_ID is not configured");
  }

  return clientId;
}

function getJwtExpiresAt(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as { exp?: unknown };

    return typeof claims.exp === "number" ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isAccessTokenFresh(token: string) {
  const expiresAt = getJwtExpiresAt(token);

  if (!expiresAt) {
    return true;
  }

  return expiresAt > Date.now() + 60_000;
}

async function persistSessionCookies(tokenSet: KeycloakTokenSet) {
  const cookieStore = await cookies();
  const setCookie = (
    cookieStore as {
      set?: (name: string, value: string, options: ReturnType<typeof cookieOptions>) => void;
    }
  ).set;

  if (!setCookie) {
    return;
  }

  try {
    setCookie.call(
      cookieStore,
      AUTH_COOKIE_NAMES.accessToken,
      tokenSet.access_token,
      cookieOptions(tokenSet.expires_in ?? 60 * 60)
    );

    if (tokenSet.refresh_token) {
      setCookie.call(
        cookieStore,
        AUTH_COOKIE_NAMES.refreshToken,
        tokenSet.refresh_token,
        cookieOptions(tokenSet.refresh_expires_in ?? 30 * 24 * 60 * 60)
      );
    }

    if (tokenSet.id_token) {
      setCookie.call(
        cookieStore,
        AUTH_COOKIE_NAMES.idToken,
        tokenSet.id_token,
        cookieOptions(tokenSet.refresh_expires_in ?? tokenSet.expires_in ?? 60 * 60)
      );
    }
  } catch {
    // Server Components cannot mutate cookies; callers still receive the fresh access token for this request.
  }
}

async function clearSessionCookieStore() {
  const cookieStore = await cookies();
  const setCookie = (
    cookieStore as {
      set?: (name: string, value: string, options: ReturnType<typeof cookieOptions>) => void;
    }
  ).set;

  if (!setCookie) {
    return;
  }

  try {
    for (const name of Object.values(AUTH_COOKIE_NAMES)) {
      setCookie.call(cookieStore, name, "", cookieOptions(0));
    }
  } catch {
    // Cookie mutation is best-effort outside Route Handlers and Server Actions.
  }
}

export async function refreshSessionTokenSet(refreshToken: string, issuer?: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: getClientId(),
    refresh_token: refreshToken
  });
  const clientSecret = getServerEnv("KEYCLOAK_CLIENT_SECRET");

  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const response = await fetch(getTokenUrl(issuer), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Refresh token exchange returned ${response.status}`);
  }

  const tokenSet = (await response.json()) as KeycloakTokenSet;

  if (!tokenSet.access_token) {
    throw new Error("Refresh token exchange did not return access_token");
  }

  return tokenSet;
}

export function setTransientAuthCookies(
  response: NextResponse,
  state: string,
  verifier: string,
  redirectTo: string
) {
  const options = cookieOptions(10 * 60);
  response.cookies.set(AUTH_COOKIE_NAMES.authState, state, options);
  response.cookies.set(AUTH_COOKIE_NAMES.pkceVerifier, verifier, options);
  response.cookies.set(AUTH_COOKIE_NAMES.redirectTo, redirectTo, options);
}

export function setSessionCookies(response: NextResponse, tokenSet: KeycloakTokenSet) {
  response.cookies.set(
    AUTH_COOKIE_NAMES.accessToken,
    tokenSet.access_token,
    cookieOptions(tokenSet.expires_in ?? 60 * 60)
  );

  if (tokenSet.refresh_token) {
    response.cookies.set(
      AUTH_COOKIE_NAMES.refreshToken,
      tokenSet.refresh_token,
      cookieOptions(tokenSet.refresh_expires_in ?? 30 * 24 * 60 * 60)
    );
  }

  if (tokenSet.id_token) {
    response.cookies.set(
      AUTH_COOKIE_NAMES.idToken,
      tokenSet.id_token,
      cookieOptions(tokenSet.refresh_expires_in ?? tokenSet.expires_in ?? 60 * 60)
    );
  }
}

export function clearTransientAuthCookies(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAMES.authState, "", cookieOptions(0));
  response.cookies.set(AUTH_COOKIE_NAMES.pkceVerifier, "", cookieOptions(0));
  response.cookies.set(AUTH_COOKIE_NAMES.redirectTo, "", cookieOptions(0));
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAMES.accessToken, "", cookieOptions(0));
  response.cookies.set(AUTH_COOKIE_NAMES.refreshToken, "", cookieOptions(0));
  response.cookies.set(AUTH_COOKIE_NAMES.idToken, "", cookieOptions(0));
  clearTransientAuthCookies(response);
}

export async function getSessionAccessToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIE_NAMES.accessToken)?.value ?? null;

  if (accessToken && isAccessTokenFresh(accessToken)) {
    return accessToken;
  }

  const refreshToken = cookieStore.get(AUTH_COOKIE_NAMES.refreshToken)?.value;

  if (!refreshToken) {
    return null;
  }

  try {
    const tokenSet = await refreshSessionTokenSet(refreshToken);
    await persistSessionCookies(tokenSet);

    return tokenSet.access_token;
  } catch {
    await clearSessionCookieStore();
    return null;
  }
}
