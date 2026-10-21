import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The session lives in httpOnly cookies, so browser code cannot read the access token itself. This
// hands a fresh one (refreshed if needed) to the notification socket client, together with the
// socket URL (docs/design/notification.md §5). Same-origin only: no CORS headers are sent.
export async function GET() {
  const token = await getSessionAccessToken();

  if (!token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const socketUrl = `${new URL(getApiBaseUrl()).origin}/notifications`;

  return NextResponse.json({ token, url: socketUrl }, { headers: { "Cache-Control": "no-store" } });
}
