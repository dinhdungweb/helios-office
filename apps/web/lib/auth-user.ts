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

export async function getCurrentSessionUser() {
  const accessToken = await getSessionAccessToken();

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<CurrentSessionUser>;
  } catch {
    return null;
  }
}
