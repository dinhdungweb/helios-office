"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ModalDialog } from "@/components/ui/primitives";
import {
  commitImportAction,
  downloadImportTemplateAction,
  getImportAction,
  startImportAction,
  type ImportJobView
} from "@/lib/import-export-actions";
import { FileDownload, UploadSimple } from "@/lib/icons";

export type ImportColumn = { key: string; header: string };

const POLL_INTERVAL_MS = 1_000;
const POLL_LIMIT = 120;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function saveBase64(fileName: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function resultSummary(result: Record<string, number> | null) {
  if (!result) return "";
  const labels: Record<string, string> = { created: "tạo mới", updated: "cập nhật", skipped: "bỏ qua" };
  return Object.entries(result).map(([key, value]) => `${value} ${labels[key] ?? key}`).join(", ");
}

// Shared Excel import flow (CORE-18): template → upload → row errors and preview → commit.
// `type` is an import type registered on the API (GET /imports/types).
export function ImportDialog({
  columns,
  onClose,
  onImported,
  title,
  type
}: {
  columns: ImportColumn[];
  onClose: () => void;
  onImported?: () => void;
  title: string;
  type: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelled = useRef(false);
  const [job, setJob] = useState<ImportJobView | null>(null);
  const [busy, setBusy] = useState<"template" | "upload" | "validating" | "committing" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const headerOf = (key?: string) => columns.find((column) => column.key === key)?.header ?? key ?? "";

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    cancelled.current = false;
    return () => {
      cancelled.current = true;
      if (dialog?.open) dialog.close();
    };
  }, []);

  const poll = async (id: string, until: ImportJobView["status"][]) => {
    for (let attempt = 0; attempt < POLL_LIMIT && !cancelled.current; attempt += 1) {
      await wait(POLL_INTERVAL_MS);
      const result = await getImportAction(id);
      if (!result.ok) {
        setError(result.error);
        return null;
      }
      setJob(result.data);
      if (!until.includes(result.data.status)) return result.data;
    }
    if (!cancelled.current) setError("Xử lý lâu hơn dự kiến. Hãy đóng và mở lại sau ít phút.");
    return null;
  };

  const downloadTemplate = async () => {
    setBusy("template");
    setError(null);
    const result = await downloadImportTemplateAction(type);
    setBusy(null);
    if (result.ok) saveBase64(result.data.fileName, result.data.base64);
    else setError(result.error);
  };

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy("upload");
    const started = await startImportAction(type, new FormData(event.currentTarget));
    if (!started.ok) {
      setBusy(null);
      setError(started.error);
      return;
    }
    setJob(started.data);
    setBusy("validating");
    await poll(started.data.id, ["validating"]);
    setBusy(null);
  };

  const commit = async () => {
    if (!job) return;
    setError(null);
    setBusy("committing");
    const started = await commitImportAction(job.id, job.status === "invalid");
    if (!started.ok) {
      setBusy(null);
      setError(started.error);
      return;
    }
    setJob(started.data);
    const finished = await poll(job.id, ["committing"]);
    setBusy(null);
    if (finished?.status === "committed") onImported?.();
  };

  const reset = () => {
    setJob(null);
    setError(null);
  };

  const reviewing = job && (job.status === "validated" || job.status === "invalid") && busy === null;
  const previewColumns = columns.filter((column) => job?.preview.some((row) => row.data[column.key] !== null && row.data[column.key] !== undefined));

  return (
    <ModalDialog className="import-dialog" ref={dialogRef} title={title} onCloseRequest={onClose}>
      <div className="import-dialog-body">
        {!job ? (
          <form className="import-dialog-pick" onSubmit={upload}>
            <ol className="import-dialog-steps">
              <li>
                <span>Tải file mẫu, điền dữ liệu từ dòng 3 (dòng 2 là ví dụ, có thể giữ hoặc xoá). Cột có dấu <b>*</b> là bắt buộc.</span>
                <button className="import-dialog-link" disabled={busy !== null} type="button" onClick={downloadTemplate}>
                  <FileDownload size={16} weight="duotone" aria-hidden="true" />
                  {busy === "template" ? "Đang tải..." : "Tải file mẫu (.xlsx)"}
                </button>
              </li>
              <li>
                <span>Chọn file đã điền. Hệ thống kiểm tra từng dòng trước, chưa ghi gì cho tới khi bạn xác nhận.</span>
                <input
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  aria-label="Chọn file Excel"
                  className="import-dialog-file"
                  name="file"
                  required
                  type="file"
                />
              </li>
            </ol>
            <div className="account-dialog-actions">
              <button className="secondary-button" type="button" onClick={onClose}>HỦY BỎ</button>
              <button className="primary-button" disabled={busy !== null} type="submit">
                <UploadSimple size={16} weight="duotone" aria-hidden="true" />
                {busy === "upload" ? "ĐANG TẢI LÊN..." : "KIỂM TRA FILE"}
              </button>
            </div>
          </form>
        ) : null}

        {busy === "validating" || busy === "committing" ? (
          <p className="import-dialog-progress" role="status">
            {busy === "validating" ? "Đang kiểm tra từng dòng..." : "Đang ghi dữ liệu..."}
          </p>
        ) : null}

        {reviewing ? (
          <>
            <p className={job.status === "invalid" ? "import-dialog-summary is-warning" : "import-dialog-summary"} role="status">
              {job.totalRows} dòng: <strong>{job.validRows} hợp lệ</strong>
              {job.invalidRows ? <>, <strong>{job.invalidRows} có lỗi</strong></> : null}
              {job.errorCount > job.errors.length ? ` (hiển thị ${job.errors.length}/${job.errorCount} lỗi)` : null}
            </p>

            {job.errors.length ? (
              <div className="import-dialog-table-shell" tabIndex={0} aria-label="Danh sách lỗi">
                <table className="import-dialog-table">
                  <thead>
                    <tr>
                      <th scope="col">Dòng</th>
                      <th scope="col">Cột</th>
                      <th scope="col">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.errors.map((issue, index) => (
                      <tr key={`${issue.row}-${issue.column ?? ""}-${index}`}>
                        <td>{issue.row}</td>
                        <td>{headerOf(issue.column)}</td>
                        <td>{issue.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {job.preview.length ? (
              <>
                <h3 className="import-dialog-heading">Xem trước dòng hợp lệ</h3>
                <div className="import-dialog-table-shell" tabIndex={0} aria-label="Xem trước dữ liệu hợp lệ">
                  <table className="import-dialog-table">
                    <thead>
                      <tr>
                        <th scope="col">Dòng</th>
                        {previewColumns.map((column) => <th key={column.key} scope="col">{column.header}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {job.preview.map((row) => (
                        <tr key={row.row}>
                          <td>{row.row}</td>
                          {previewColumns.map((column) => <td key={column.key}>{String(row.data[column.key] ?? "")}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            <div className="account-dialog-actions">
              <button className="secondary-button" type="button" onClick={reset}>CHỌN FILE KHÁC</button>
              <button className="primary-button" disabled={job.validRows === 0} type="button" onClick={commit}>
                {job.status === "invalid" ? `BỎ QUA DÒNG LỖI, NHẬP ${job.validRows} DÒNG` : `NHẬP ${job.validRows} DÒNG`}
              </button>
            </div>
          </>
        ) : null}

        {job?.status === "committed" ? (
          <>
            <p className="import-dialog-summary is-success" role="status">Đã nhập xong: {resultSummary(job.result)}.</p>
            <div className="account-dialog-actions">
              <button className="primary-button" type="button" onClick={onClose}>ĐÓNG</button>
            </div>
          </>
        ) : null}

        {job?.status === "failed" ? (
          <>
            <p className="account-dialog-error" role="alert">Không xử lý được file: {job.error ?? "lỗi không xác định"}.</p>
            <div className="account-dialog-actions">
              <button className="secondary-button" type="button" onClick={reset}>CHỌN FILE KHÁC</button>
            </div>
          </>
        ) : null}

        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
      </div>
    </ModalDialog>
  );
}
