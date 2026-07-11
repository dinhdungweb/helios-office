import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const accessTokenCookieName = "helios_access_token";

export function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(accessTokenCookieName)?.value;

  if (accessToken) {
    return NextResponse.next();
  }

  const redirectUrl = new URL("/login", request.url);
  redirectUrl.searchParams.set("redirectTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/admin/:path*"]
};
