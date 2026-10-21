import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

// CORE-13: the audit trail (GET /audit-logs), read by system admins.

export type AuditLogEntry = {
  id: string;
  createdAt: string;
  action: string;
  source: "domain" | "http";
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  actorAccount: { id: string; displayName: string; email: string } | null;
  employee: { id: string; code: string; fullName: string } | null;
};

export type AuditLogPage = { items: AuditLogEntry[]; total: number; page: number; limit: number; pageCount: number };

export type AuditLogFilters = { q?: string; source?: string; action?: string; entityType?: string; from?: string; to?: string; page?: string };

export async function getAuditLogs(filters: AuditLogFilters): Promise<AuditLogPage> {
  const params = new URLSearchParams({ limit: "50", sort: "createdAt", order: "desc" });

  for (const key of ["q", "source", "action", "entityType", "page"] as const) {
    const value = filters[key]?.trim();
    if (value) params.set(key, value);
  }
  // Date inputs give YYYY-MM-DD; cover the whole day in Vietnam time.
  if (filters.from) params.set("from", new Date(`${filters.from}T00:00:00+07:00`).toISOString());
  if (filters.to) params.set("to", new Date(`${filters.to}T23:59:59.999+07:00`).toISOString());

  const accessToken = await getSessionAccessToken();
  const response = await fetch(`${getApiBaseUrl()}/audit-logs?${params.toString()}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`/audit-logs returned ${response.status}`);
  }

  return response.json() as Promise<AuditLogPage>;
}
