import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import type { LoginOutcome } from "@/lib/login-events";

// Sessions (AU-16) and login history (AU-20) as the API returns them.

export type LoginSession = {
  id: string;
  current: boolean;
  startedAt: string | null;
  lastAccessAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export type LoginHistoryEntry = {
  id: string;
  outcome: LoginOutcome;
  username: string;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  createdAt: string;
};

async function getJson<T>(path: string): Promise<T> {
  const accessToken = await getSessionAccessToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getMySessions() {
  return getJson<LoginSession[]>("/auth/sessions");
}

export function getMyLoginHistory(limit = 50) {
  return getJson<LoginHistoryEntry[]>(`/auth/login-history?limit=${limit}`);
}

export function getAccountLoginHistory(accountId: string, limit = 50) {
  return getJson<LoginHistoryEntry[]>(`/account-access/accounts/${encodeURIComponent(accountId)}/login-history?limit=${limit}`);
}
