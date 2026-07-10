import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

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
  return cookieStore.get(AUTH_COOKIE_NAMES.accessToken)?.value ?? null;
}
