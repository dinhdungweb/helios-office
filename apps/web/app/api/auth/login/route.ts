import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getKeycloakTokenUrl,
  getWebAuthConfig,
  type WebAuthConfig
} from "@/lib/auth-config";
import {
  clearTransientAuthCookies,
  setSessionCookies,
  type KeycloakTokenSet
} from "@/lib/auth-session";

export const runtime = "nodejs";

function sanitizeRedirectTo(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/user";
  }

  return value;
}

function buildLoginPageUrl(request: NextRequest, redirectTo: string, error?: string) {
  const url = new URL("/login", request.url);

  if (redirectTo !== "/user") {
    url.searchParams.set("redirectTo", redirectTo);
  }

  if (error) {
    url.searchParams.set("error", error);
  }

  return url;
}

function loginErrorResponse(request: NextRequest, redirectTo: string, error: string) {
  return NextResponse.redirect(buildLoginPageUrl(request, redirectTo, error), 303);
}

async function exchangePasswordForToken(config: WebAuthConfig, username: string, password: string) {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: config.clientId,
    username,
    password,
    scope: "openid email profile"
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
    if (response.status === 400 || response.status === 401) {
      throw new Error("invalid_credentials");
    }

    throw new Error(`Password grant returned ${response.status}`);
  }

  return response.json() as Promise<KeycloakTokenSet>;
}

async function buildLoginResponse(request: NextRequest, formData: FormData) {
  const redirectTo = sanitizeRedirectTo(formData.get("redirectTo"));
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return loginErrorResponse(request, redirectTo, "missing_credentials");
  }

  const config = getWebAuthConfig(request.nextUrl.origin);
  const tokenSet = await exchangePasswordForToken(config, username, password);

  if (!tokenSet.access_token) {
    return loginErrorResponse(request, redirectTo, "token");
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url), 303);
  setSessionCookies(response, tokenSet);
  clearTransientAuthCookies(response);

  return response;
}

function authConfigErrorResponse(request: NextRequest, redirectTo = "/user") {
  return loginErrorResponse(request, redirectTo, "auth_config");
}

export async function GET(request: NextRequest) {
  const redirectTo = sanitizeRedirectTo(request.nextUrl.searchParams.get("redirectTo"));
  return NextResponse.redirect(buildLoginPageUrl(request, redirectTo), 303);
}

export async function POST(request: NextRequest) {
  let redirectTo = "/user";

  try {
    const formData = await request.formData();
    redirectTo = sanitizeRedirectTo(formData.get("redirectTo"));
    return await buildLoginResponse(request, formData);
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_credentials") {
      return loginErrorResponse(request, redirectTo, "credentials");
    }

    if (error instanceof Error && error.message.includes("is not configured")) {
      return authConfigErrorResponse(request, redirectTo);
    }

    return loginErrorResponse(request, redirectTo, "provider");
  }
}
