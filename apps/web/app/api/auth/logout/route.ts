import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getKeycloakLogoutUrl, getWebAuthConfig } from "@/lib/auth-config";
import { AUTH_COOKIE_NAMES, clearSessionCookies } from "@/lib/auth-session";
import { buildRequestUrl, getRequestOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

function buildLogoutResponse(request: NextRequest) {
  const config = getWebAuthConfig(getRequestOrigin(request));
  const idToken = request.cookies.get(AUTH_COOKIE_NAMES.idToken)?.value;
  const logoutUrl = getKeycloakLogoutUrl(config);

  logoutUrl.searchParams.set("client_id", config.clientId);
  logoutUrl.searchParams.set("post_logout_redirect_uri", config.postLogoutRedirectUri);

  if (idToken) {
    logoutUrl.searchParams.set("id_token_hint", idToken);
  }

  const response = NextResponse.redirect(logoutUrl, 303);
  clearSessionCookies(response);

  return response;
}

function localLogoutResponse(request: NextRequest) {
  const response = NextResponse.redirect(buildRequestUrl(request, "/login"), 303);
  clearSessionCookies(response);

  return response;
}

export async function GET(request: NextRequest) {
  try {
    return buildLogoutResponse(request);
  } catch {
    return localLogoutResponse(request);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
