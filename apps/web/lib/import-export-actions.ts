"use server";

import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import { getCurrentSessionUser } from "@/lib/auth-user";

// Server side of the shared import dialog and export button (API: /imports, /exports, see
// docs/design/import-export.md). The browser never holds the API token, so uploads and polling go
// through these actions.

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export type ImportIssue = { row: number; column?: string; message: string };

export type ImportJobView = {
  id: string;
  type: string;
  status: "validating" | "validated" | "invalid" | "committing" | "committed" | "failed";
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errorCount: number;
  errors: ImportIssue[];
  preview: Array<{ row: number; data: Record<string, unknown> }>;
  result: Record<string, number> | null;
  error: string | null;
};

export type ExportJobView = {
  id: string;
  status: "running" | "ready" | "failed";
  rowCount: number | null;
  fileName: string | null;
  downloadUrl: string | null;
  error: string | null;
};

export type TransferResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function authHeaders(json = true) {
  const token = await getSessionAccessToken();
  const headers = new Headers(json ? { "Content-Type": "application/json" } : {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

function friendlyError(status: number, fallback: string) {
  if (status === 401) return "Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.";
  if (status === 403) return "Tài khoản hiện tại không có quyền thực hiện thao tác này.";
  if (status === 409) return "Dữ liệu đã thay đổi trạng thái, hãy tải lại và thử lại.";
  if (status === 503) return "Hệ thống xử lý nền đang bận hoặc chưa chạy, hãy thử lại sau.";
  return fallback;
}

async function call<T>(method: "GET" | "POST", path: string, body: unknown, fallback: string): Promise<TransferResult<T>> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: await authHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store"
    });
    if (!response.ok) return { ok: false, error: friendlyError(response.status, fallback) };
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: "Chưa kết nối được API, hãy thử lại." };
  }
}

export async function downloadImportTemplateAction(type: string): Promise<TransferResult<{ fileName: string; base64: string }>> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/imports/templates/${encodeURIComponent(type)}`, { headers: await authHeaders(false), cache: "no-store" });
    if (!response.ok) return { ok: false, error: friendlyError(response.status, "Không tải được file mẫu.") };
    const fileName = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? `mau-import-${type}.xlsx`;
    return { ok: true, data: { fileName, base64: Buffer.from(await response.arrayBuffer()).toString("base64") } };
  } catch {
    return { ok: false, error: "Chưa kết nối được API, hãy thử lại." };
  }
}

// Uploads the workbook to storage (purpose import_file, owned by the current account) and starts
// validation. Returns the job to poll with getImportAction.
export async function startImportAction(type: string, formData: FormData): Promise<TransferResult<ImportJobView>> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Hãy chọn file Excel (.xlsx)." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { ok: false, error: "Chỉ nhận file Excel .xlsx — hãy dùng file mẫu." };
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, error: "File vượt quá 25 MB." };

  const user = await getCurrentSessionUser();
  if (!user?.account) return { ok: false, error: "Phiên đăng nhập đã hết hạn, hãy đăng nhập lại." };

  const presign = await call<{ file: { id: string }; uploadUrl: string; headers: Record<string, string> }>(
    "POST",
    "/files/presign",
    { fileName: file.name, mimeType: XLSX_MIME, size: file.size, purpose: "import_file", ownerId: user.account.id },
    "Không tải được file lên."
  );
  if (!presign.ok) return presign;

  try {
    const stored = await fetch(presign.data.uploadUrl, { method: "PUT", headers: presign.data.headers, body: Buffer.from(await file.arrayBuffer()) });
    if (!stored.ok) return { ok: false, error: "Kho lưu trữ file không nhận file, hãy thử lại." };
  } catch {
    return { ok: false, error: "Chưa kết nối được kho lưu trữ file." };
  }

  const completed = await call("POST", `/files/${presign.data.file.id}/complete`, undefined, "File tải lên không hợp lệ (chỉ nhận .xlsx).");
  if (!completed.ok) return completed;

  return call<ImportJobView>("POST", "/imports", { type, fileId: presign.data.file.id }, "Không bắt đầu được việc kiểm tra file.");
}

export async function getImportAction(id: string) {
  return call<ImportJobView>("GET", `/imports/${encodeURIComponent(id)}`, undefined, "Không đọc được trạng thái import.");
}

export async function commitImportAction(id: string, skipInvalid: boolean) {
  return call<ImportJobView>("POST", `/imports/${encodeURIComponent(id)}/commit`, { skipInvalid }, "Không ghi được dữ liệu import.");
}

export async function startExportAction(type: string, params: Record<string, string> = {}) {
  return call<ExportJobView>("POST", "/exports", { type, params }, "Không bắt đầu được việc xuất file.");
}

export async function getExportAction(id: string) {
  return call<ExportJobView>("GET", `/exports/${encodeURIComponent(id)}`, undefined, "Không đọc được trạng thái xuất file.");
}
