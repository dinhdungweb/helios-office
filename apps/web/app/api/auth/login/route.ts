import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getKeycloakAuthUrl, getWebAuthConfig } from "@/lib/auth-config";
import { setTransientAuthCookies } from "@/lib/auth-session";

export const runtime = "nodejs";

function toBase64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function sanitizeRedirectTo(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/user";
  }

  return value;
}

function buildLoginResponse(request: NextRequest, redirectTo: string) {
  const config = getWebAuthConfig(request.nextUrl.origin);
  const state = toBase64Url(randomBytes(24));
  const verifier = toBase64Url(randomBytes(48));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authUrl = getKeycloakAuthUrl(config);

  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authUrl, 303);
  setTransientAuthCookies(response, state, verifier, redirectTo);

  return response;
}

function authConfigErrorResponse(request: NextRequest) {
  return NextResponse.redirect(new URL("/login?error=auth_config", request.url), 303);
}

export async function GET(request: NextRequest) {
  try {
    return buildLoginResponse(request, sanitizeRedirectTo(request.nextUrl.searchParams.get("redirectTo")));
  } catch {
    return authConfigErrorResponse(request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    return buildLoginResponse(request, sanitizeRedirectTo(formData.get("redirectTo")));
  } catch {
    return authConfigErrorResponse(request);
  }
}
