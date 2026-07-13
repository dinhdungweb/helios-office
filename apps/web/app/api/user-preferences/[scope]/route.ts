import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export const runtime = "nodejs";

function backendUrl(scope: string) {
  return `${getApiBaseUrl()}/user-preferences/${encodeURIComponent(scope)}`;
}

function sanitizeScope(scope: string) {
  return scope.trim().toLowerCase();
}

async function authorizedHeaders(contentType = false) {
  const accessToken = await getSessionAccessToken();
  const headers = new Headers();

  if (contentType) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

async function proxyJson(response: Response) {
  const content = await response.text();

  return new NextResponse(content, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json"
    }
  });
}

export async function GET(_request: NextRequest, context: { params: Promise<{ scope: string }> }) {
  const { scope } = await context.params;
  const response = await fetch(backendUrl(sanitizeScope(scope)), {
    headers: await authorizedHeaders(),
    cache: "no-store"
  });

  return proxyJson(response);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ scope: string }> }) {
  const { scope } = await context.params;
  const body = await request.text();
  const response = await fetch(backendUrl(sanitizeScope(scope)), {
    method: "PATCH",
    headers: await authorizedHeaders(true),
    body,
    cache: "no-store"
  });

  return proxyJson(response);
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ scope: string }> }) {
  const { scope } = await context.params;
  const response = await fetch(backendUrl(sanitizeScope(scope)), {
    method: "DELETE",
    headers: await authorizedHeaders(),
    cache: "no-store"
  });

  return proxyJson(response);
}
