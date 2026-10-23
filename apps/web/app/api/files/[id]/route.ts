import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opens a stored file for the signed-in user (AT-14 check-in photos first). The API checks access
// and answers with a short-lived storage URL; the browser is sent there. ?download=1 saves the
// file instead of showing it.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getSessionAccessToken();
  if (!token) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const download = new URL(request.url).searchParams.get("download") === "1";
  const response = await fetch(`${getApiBaseUrl()}/files/${encodeURIComponent(id)}${download ? "" : "?inline=1"}`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "manual",
    cache: "no-store"
  });
  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) {
    return NextResponse.redirect(location, { status: 302, headers: { "Cache-Control": "no-store" } });
  }
  return new NextResponse(response.status === 404 ? "Không tìm thấy file hoặc bạn không có quyền xem." : "Không mở được file.", {
    status: response.status === 404 ? 404 : 502,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
