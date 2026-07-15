import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildRequestUrl } from "@/lib/request-origin";

const accessTokenCookieName = "helios_access_token";
const refreshTokenCookieName = "helios_refresh_token";

function getJwtExpiresAt(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded)) as { exp?: unknown };

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

function redirectToLogin(request: NextRequest) {
  const redirectUrl = buildRequestUrl(request, "/login");
  redirectUrl.searchParams.set("redirectTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(redirectUrl);
}

function redirectToRefresh(request: NextRequest) {
  const refreshUrl = buildRequestUrl(request, "/api/auth/refresh");
  refreshUrl.searchParams.set("redirectTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(refreshUrl);
}

export function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(accessTokenCookieName)?.value;
  const refreshToken = request.cookies.get(refreshTokenCookieName)?.value;

  if (accessToken && isAccessTokenFresh(accessToken)) {
    return NextResponse.next();
  }

  if (refreshToken) {
    if (request.method === "GET" || request.method === "HEAD") {
      return redirectToRefresh(request);
    }

    return NextResponse.next();
  }

  return redirectToLogin(request);
}

export const config = {
  matcher: ["/admin/:path*"]
};
