// Types and labels of requests (Phase 3), shared by server loaders and client components.

export type RequestStatus = "draft" | "pending" | "returned" | "approved" | "rejected" | "cancelled";
export type RequestBox = "mine" | "to_approve" | "processed" | "following" | "all";

export type Person = { id: string; code?: string; fullName: string; avatarUrl?: string | null; department?: { id: string; name: string } | null };

export type RequestSummary = {
  id: string;
  code: string;
  type: string;
  typeLabel: string;
  subType: string | null;
  status: RequestStatus;
  title: string;
  fromDate: string | null;
  toDate: string | null;
  quantity: number | null;
  unit: string | null;
  round: number;
  version: number;
  needsAttention: boolean;
  usedDefaultWorkflow: boolean;
  submittedAt: string | null;
  decidedAt: string | null;
  cancelReason: string | null;
  createdAt: string;
};

export type RequestListItem = RequestSummary & {
  requester: Person;
  currentStep: { id: string; name: string; dueAt: string | null; assignees: Array<Person & { status: string }> } | null;
  myStepId: string | null;
};

export type RequestList = { items: RequestListItem[]; total: number; page: number; limit: number; pageCount: number };

export type StepAssignee = Person & { status: string; resolvedFrom: string; onBehalfOfId: string | null; actedAt: string | null };

export type RequestStep = {
  id: string;
  nodeId: string;
  name: string;
  mode: "any" | "all";
  status: "active" | "approved" | "rejected" | "returned" | "skipped" | "cancelled";
  round: number;
  dueAt: string | null;
  openedAt: string;
  closedAt: string | null;
  assignees: StepAssignee[];
};

export type LeaveDay = { date: string; minutes: number; units: number };
export type LeaveRange = { fromDate: string; toDate: string; fromTime?: string | null; toTime?: string | null };

export type LeavePayload = {
  leaveTypeCode: string;
  leaveTypeName: string;
  paid: boolean;
  deductsBalance: boolean;
  ranges: LeaveRange[];
  reason: string | null;
  days: LeaveDay[];
};

export type RequestDetail = RequestSummary & {
  payload: Partial<LeavePayload> & Record<string, unknown>;
  requester: Person;
  workflow: { id: string; name: string; version: number } | null;
  steps: RequestStep[];
  followers: Person[];
  permissions: {
    canEdit: boolean;
    canSubmit: boolean;
    canRecall: boolean;
    canCancel: boolean;
    myStepId: string | null;
    canReturn: boolean;
    canComment: boolean;
  };
};

export type TimelineEntry =
  | {
      kind: "action";
      id: string;
      action: string;
      actorType: "user" | "system";
      actor: Person | null;
      step: { id: string; name: string; round: number } | null;
      reason: string | null;
      data: Record<string, unknown> | null;
      at: string;
    }
  | { kind: "comment"; id: string; author: Person | null; body: string; at: string };

export type LeaveType = {
  id: string;
  code: string;
  name: string;
  paid: boolean;
  deductsBalance: boolean;
  minUnit: "day" | "half_day" | "hour";
  maxDaysPerRequest: string | number | null;
  requiresDocument: boolean;
  gender: "all" | "male" | "female";
  allowDuringProbation: boolean;
  status: "active" | "archived";
  sortOrder: number;
};

export type LeaveBalance = {
  leaveType: { id: string; code: string; name: string };
  entitled: number;
  carriedOver: number;
  adjusted: number;
  used: number;
  pending: number;
  expired: number;
  available: number;
  carryOverExpiresAt: string | null;
};

export type BalanceRow = { employee: Person; balances: LeaveBalance[] };
export type BalanceList = { year: number; items: BalanceRow[]; total: number; page: number; limit: number; pageCount: number };

export type LeavePreview = { total: number; days: LeaveDay[]; deductsBalance: boolean; remaining: Array<{ year: number; available: number; afterRequest: number }> };

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  returned: "Bị trả lại",
  approved: "Đã duyệt",
  rejected: "Không duyệt",
  cancelled: "Đã huỷ"
};

export const REQUEST_STATUS_TONE: Record<RequestStatus, "warning" | "success" | "danger" | "neutral"> = {
  draft: "neutral",
  pending: "warning",
  returned: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral"
};

export const REQUEST_BOX_LABEL: Record<RequestBox, string> = {
  mine: "Đơn của tôi",
  to_approve: "Cần tôi duyệt",
  processed: "Tôi đã xử lý",
  following: "Tôi theo dõi",
  all: "Tất cả đơn"
};

export const ACTION_LABEL: Record<string, string> = {
  create: "đã tạo đơn",
  submit: "đã gửi đơn",
  resubmit: "đã gửi lại đơn",
  approve: "đã duyệt",
  reject: "đã từ chối",
  return: "đã trả lại để bổ sung",
  forward: "đã chuyển tiếp",
  recall: "đã rút đơn",
  cancel: "đã huỷ đơn",
  auto_skipped: "Bỏ qua bước (người duyệt trùng người tạo)",
  auto_approve: "Tự động duyệt khi quá hạn",
  auto_reject: "Tự động từ chối khi quá hạn",
  notify: "Đã gửi thông báo theo quy trình",
  complete: "Quy trình kết thúc",
  error: "Quy trình gặp lỗi",
  reminder: "Đã nhắc người duyệt"
};

export const MIN_UNIT_LABEL: Record<LeaveType["minUnit"], string> = { day: "Cả ngày", half_day: "Nửa ngày", hour: "Theo giờ" };

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function formatDays(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ngày`;
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts.at(-2)?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase() || "?";
}

export function requestRange(request: Pick<RequestSummary, "fromDate" | "toDate">) {
  if (!request.fromDate) return "";
  return request.fromDate === request.toDate || !request.toDate ? formatDate(request.fromDate) : `${formatDate(request.fromDate)} – ${formatDate(request.toDate)}`;
}
