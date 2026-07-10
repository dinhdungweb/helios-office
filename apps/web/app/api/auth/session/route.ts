import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth-user";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentSessionUser();

  return NextResponse.json({
    authenticated: Boolean(user),
    user
  });
}
