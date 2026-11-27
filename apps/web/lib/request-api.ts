import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import { getCurrentSessionUserOrSignOut } from "@/lib/auth-user";
import type { BalanceList, LeaveBalance, LeaveType, RequestBox, RequestDetail, RequestList, TimelineEntry } from "@/lib/request-format";

// Server-side loading for the "Đơn từ" module (LV-01 → LV-16, AP-14, AP-19). Client components
// import types and labels from request-format.ts.

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

async function requestJson<T>(path: string): Promise<Loaded<T>> {
  const accessToken = await getSessionAccessToken();
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, cache: "no-store" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(body?.message) ? body.message.join(". ") : body?.message;
      return { ok: false, status: response.status, error: response.status === 404 ? "Không tìm thấy đơn." : message || `Không tải được dữ liệu (${response.status}).` };
    }
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ." };
  }
}

const REQUEST_VIEW = ["permission.requests.view", "permission.requests.manage"];
const LEAVE_MANAGE = "permission.leave.manage";
const APPROVAL_MANAGE = "permission.approvals.manage";

// What the viewer may open in the module, from their effective permissions.
export async function getRequestAccess() {
  const account = (await getCurrentSessionUserOrSignOut())?.account;
  const isAdmin = account?.adminRole === "system_admin";
  const granted = new Set(account?.effectivePermissionKeys ?? []);
  const has = (keys: string[]) => isAdmin || keys.some((key) => granted.has(key));
  return {
    hasProfile: Boolean(account?.employeeId),
    canViewAll: has(REQUEST_VIEW),
    canManageLeave: has([LEAVE_MANAGE]),
    canViewBalances: has([...REQUEST_VIEW, LEAVE_MANAGE]),
    canManageWorkflows: has([APPROVAL_MANAGE])
  };
}

export function getRequestList(params: { box: RequestBox; status?: string; type?: string; q?: string; page?: number; from?: string; to?: string }) {
  const query = new URLSearchParams({ box: params.box, limit: "30", page: String(params.page ?? 1) });
  if (params.status) query.set("status", params.status);
  if (params.type) query.set("type", params.type);
  if (params.q) query.set("q", params.q);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return requestJson<RequestList>(`/requests?${query}`);
}

export async function getToApproveCount() {
  const result = await requestJson<RequestList>("/requests?box=to_approve&limit=1");
  return result.ok ? result.data.total : 0;
}

export function getRequestDetail(id: string) {
  return requestJson<RequestDetail>(`/requests/${encodeURIComponent(id)}`);
}

export function getRequestTimeline(id: string) {
  return requestJson<TimelineEntry[]>(`/approvals/${encodeURIComponent(id)}/timeline`);
}

export function getLeaveTypes(includeArchived = false) {
  return requestJson<LeaveType[]>(`/leave-types${includeArchived ? "?includeArchived=true" : ""}`);
}

export function getMyBalances(year?: number) {
  return requestJson<{ year: number; balances: LeaveBalance[] }>(`/leave-balances/me${year ? `?year=${year}` : ""}`);
}

export function getBalanceList(params: { year?: number; q?: string; page?: number }) {
  const query = new URLSearchParams({ limit: "50", page: String(params.page ?? 1) });
  if (params.year) query.set("year", String(params.year));
  if (params.q) query.set("q", params.q);
  return requestJson<BalanceList>(`/leave-balances?${query}`);
}
