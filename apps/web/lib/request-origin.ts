import type { NextRequest } from "next/server";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function getRequestOrigin(request: NextRequest) {
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? request.headers.get("host");

  if (!host) {
    return request.nextUrl.origin;
  }

  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const protocol = (forwardedProto ?? request.nextUrl.protocol.replace(/:$/, "") ?? "http").replace(/:$/, "");

  return `${protocol}://${host}`;
}

export function buildRequestUrl(request: NextRequest, path: string) {
  return new URL(path, getRequestOrigin(request));
}
