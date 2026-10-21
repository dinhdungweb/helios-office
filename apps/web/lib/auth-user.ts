import { redirect } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type CurrentSessionUser = {
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
  account: {
    id: string;
    email: string;
    displayName: string;
    employeeId: string | null;
    adminRole: string;
    accountStatus: string;
    effectivePermissionKeys: string[];
  } | null;
};

async function fetchSessionUser(): Promise<{ user: CurrentSessionUser | null; code?: string }> {
  const accessToken = await getSessionAccessToken();

  if (!accessToken) {
    return { user: null };
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const body = response.status === 401 ? ((await response.json().catch(() => null)) as { code?: unknown } | null) : null;
      return { user: null, code: typeof body?.code === "string" ? body.code : undefined };
    }

    return { user: (await response.json()) as CurrentSessionUser };
  } catch {
    return { user: null };
  }
}

export async function getCurrentSessionUser() {
  return (await fetchSessionUser()).user;
}

// For the page frame: a session signed out elsewhere (AU-16/17) still has unexpired cookies, so
// end it here instead of rendering pages whose API calls are all refused.
export async function getCurrentSessionUserOrSignOut() {
  const { user, code } = await fetchSessionUser();

  if (code === "session_revoked") {
    redirect("/api/auth/logout?reason=session_revoked");
  }

  return user;
}
