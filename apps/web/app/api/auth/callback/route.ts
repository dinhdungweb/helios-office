import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getKeycloakTokenUrl,
  getWebAuthConfig,
  type WebAuthConfig
} from "@/lib/auth-config";
import {
  AUTH_COOKIE_NAMES,
  clearTransientAuthCookies,
  setSessionCookies,
  type KeycloakTokenSet
} from "@/lib/auth-session";
import { buildRequestUrl, getRequestOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

function loginErrorResponse(request: NextRequest, error: string) {
  const url = buildRequestUrl(request, "/login");
  url.searchParams.set("error", error);

  return NextResponse.redirect(url, 303);
}

function sanitizeRedirectTo(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/user";
  }

  return value;
}

async function exchangeCodeForToken(config: WebAuthConfig, code: string, verifier: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: verifier
  });

  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  const response = await fetch(getKeycloakTokenUrl(config), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Token exchange returned ${response.status}`);
  }

  return response.json() as Promise<KeycloakTokenSet>;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const providerError = request.nextUrl.searchParams.get("error");
  const savedState = request.cookies.get(AUTH_COOKIE_NAMES.authState)?.value;
  const verifier = request.cookies.get(AUTH_COOKIE_NAMES.pkceVerifier)?.value;
  const redirectTo = sanitizeRedirectTo(request.cookies.get(AUTH_COOKIE_NAMES.redirectTo)?.value);

  if (providerError) {
    return loginErrorResponse(request, "provider");
  }

  if (!code || !returnedState || !savedState || returnedState !== savedState || !verifier) {
    return loginErrorResponse(request, "state");
  }

  try {
    const origin = getRequestOrigin(request);
    const config = getWebAuthConfig(origin);
    const tokenSet = await exchangeCodeForToken(config, code, verifier);

    if (!tokenSet.access_token) {
      return loginErrorResponse(request, "token");
    }

    const response = NextResponse.redirect(new URL(redirectTo, origin), 303);
    setSessionCookies(response, tokenSet);
    clearTransientAuthCookies(response);

    return response;
  } catch {
    return loginErrorResponse(request, "token");
  }
}
