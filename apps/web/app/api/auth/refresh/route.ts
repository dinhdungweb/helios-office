import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAMES,
  clearSessionCookies,
  refreshSessionTokenSet,
  setSessionCookies
} from "@/lib/auth-session";

export const runtime = "nodejs";

function sanitizeRedirectTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/user";
  }

  return value;
}

function loginRedirect(request: NextRequest, redirectTo: string, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("redirectTo", redirectTo);
  url.searchParams.set("error", error);

  return NextResponse.redirect(url, 303);
}

export async function GET(request: NextRequest) {
  const redirectTo = sanitizeRedirectTo(request.nextUrl.searchParams.get("redirectTo"));
  const refreshToken = request.cookies.get(AUTH_COOKIE_NAMES.refreshToken)?.value;

  if (!refreshToken) {
    const response = loginRedirect(request, redirectTo, "session_expired");
    clearSessionCookies(response);

    return response;
  }

  try {
    const tokenSet = await refreshSessionTokenSet(refreshToken);
    const response = NextResponse.redirect(new URL(redirectTo, request.url), 303);
    setSessionCookies(response, tokenSet);

    return response;
  } catch {
    const response = loginRedirect(request, redirectTo, "session_expired");
    clearSessionCookies(response);

    return response;
  }
}
