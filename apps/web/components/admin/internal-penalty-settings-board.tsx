"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FormCheckbox } from "@/components/ui/form-controls";
import { FormField, FormInput, ModalDialog, StateBlock } from "@/components/ui/primitives";
import { createInternalPenaltyAction, deleteInternalPenaltiesAction, type InternalPenaltyFormState } from "@/lib/internal-penalty-actions";
import type { InternalPenaltyData, InternalPenaltyRecord } from "@/lib/internal-penalty-api";
import { datedCsvFilename, exportCsv } from "@/lib/csv-export";
import { Export, FileText, Plus, Trash, UploadSimple, X } from "@/lib/icons";

type PenaltyRow = {
  id: string;
  violation: string;
  amount: string;
  description: string;
};

const initialState: InternalPenaltyFormState = { ok: false };
const emptyRow = (id: string): PenaltyRow => ({ id, violation: "", amount: "", description: "" });

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("vi");
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  const time = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  const day = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  return `${time} ${day}`;
}

function creatorInitials(penalty: InternalPenaltyRecord) {
  return penalty.createdBy?.fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "A";
}

function splitCsvRow(row: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function InternalPenaltyDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const router = useRouter();
  const [rows, setRows] = useState<PenaltyRow[]>([emptyRow("penalty-row-1")]);
  const [state, formAction, isPending] = useActionState(createInternalPenaltyAction, initialState);

  useEffect(() => {
    const dialog = dialogRef.current;
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    dialog?.showModal();
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    onClose();
  }, [onClose, router, state.ok]);

  const updateRow = (id: string, field: keyof Omit<PenaltyRow, "id">, value: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  };

  const removeRow = (id: string) => {
    setRows((current) => current.length === 1 ? [emptyRow(current[0].id)] : current.filter((row) => row.id !== id));
  };

  const addRow = () => {
    setRows((current) => [...current, emptyRow(`penalty-row-${crypto.randomUUID()}`)]);
  };

  return (
    <ModalDialog
      className="position-catalog-dialog internal-penalty-dialog"
      ref={dialogRef}
      title="Tạo mới phạt nội bộ"
      onCloseRequest={onClose}
    >
      <form className="account-dialog-form internal-penalty-dialog-form position-catalog-dialog-form" action={formAction}>
        <div className="internal-penalty-create-rows">
          {rows.map((row) => (
            <div className="internal-penalty-create-row" key={row.id}>
              <FormField label={<>Lỗi vi phạm <b>*</b></>}>
                <FormInput
                  name="violation"
                  placeholder="Nhập lỗi vi phạm"
                  required
                  minLength={2}
                  value={row.violation}
                  onChange={(event) => updateRow(row.id, "violation", event.target.value)}
                />
              </FormField>
              <FormField label="Số tiền">
                <FormInput
                  inputMode="numeric"
                  name="amount"
                  placeholder="1,000,000"
                  value={row.amount}
                  onChange={(event) => updateRow(row.id, "amount", event.target.value.replace(/[^\d,.]/g, ""))}
                />
              </FormField>
              <FormField label="Mô tả">
                <FormInput
                  name="description"
                  placeholder="Nhập mô tả"
                  value={row.description}
                  onChange={(event) => updateRow(row.id, "description", event.target.value)}
                />
              </FormField>
              <button className="personnel-title-remove-row" type="button" aria-label="Xóa dòng phạt nội bộ" onClick={() => removeRow(row.id)}>
                <X size={19} weight="duotone" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <button className="personnel-title-add-row" type="button" aria-label="Thêm dòng phạt nội bộ" onClick={addRow}>
          <Plus size={17} weight="duotone" aria-hidden="true" />
        </button>

        {state.error ? <p className="account-dialog-error">{state.error}</p> : null}
        <div className="account-dialog-actions internal-penalty-dialog-actions position-catalog-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>HỦY BỎ</button>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

export function InternalPenaltySettingsBoard({ data, query = "" }: { data: InternalPenaltyData; query?: string }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = normalizeSearch(query);
  const visiblePenalties = useMemo(() => {
    if (!normalizedQuery) return data.penalties;

    return data.penalties.filter((penalty) => [
      penalty.violation,
      penalty.description ?? "",
      penalty.createdBy?.fullName ?? "",
      String(penalty.amount)
    ].some((value) => normalizeSearch(value).includes(normalizedQuery)));
  }, [data.penalties, normalizedQuery]);

  const allVisibleSelected = visiblePenalties.length > 0 && visiblePenalties.every((penalty) => selectedIds.includes(penalty.id));

  const deleteSelectedPenalties = () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(`Xóa ${selectedIds.length} phạt nội bộ đã chọn? Thao tác này không thể hoàn tác.`);
    if (!confirmed) return;

    setDeleteMessage(null);
    startDeleteTransition(async () => {
      const result = await deleteInternalPenaltiesAction(selectedIds);
      if (!result.ok) {
        setDeleteMessage(result.error ?? "Không xóa được phạt nội bộ.");
        return;
      }

      setSelectedIds([]);
      router.refresh();
    });
  };

  const exportPenalties = () => {
    exportCsv({
      filename: datedCsvFilename("phat-noi-bo"),
      rows: visiblePenalties,
      columns: [
        { header: "Người tạo", value: (penalty) => penalty.createdBy?.fullName ?? "" },
        { header: "Lỗi vi phạm", value: (penalty) => penalty.violation },
        { header: "Số tiền", value: (penalty) => penalty.amount },
        { header: "Mô tả", value: (penalty) => penalty.description ?? "" },
        { header: "Trạng thái", value: (penalty) => penalty.status === "active" ? "Hoạt động" : "Không hoạt động" }
      ]
    });
  };

  const importPenalties = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);

    try {
      const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim().length > 0);
      const header = splitCsvRow(lines.shift() ?? "").map(normalizeSearch);
      const violationIndex = header.findIndex((value) => value === "lỗi vi phạm" || value === "vi phạm");
      const amountIndex = header.indexOf("số tiền");
      const descriptionIndex = header.indexOf("mô tả");
      if (violationIndex < 0) throw new Error("CSV cần có cột Lỗi vi phạm.");

      let successCount = 0;
      for (const line of lines) {
        const values = splitCsvRow(line);
        const formData = new FormData();
        formData.append("violation", values[violationIndex] ?? "");
        formData.append("amount", amountIndex >= 0 ? values[amountIndex] ?? "0" : "0");
        formData.append("description", descriptionIndex >= 0 ? values[descriptionIndex] ?? "" : "");
        const result = await createInternalPenaltyAction(initialState, formData);
        if (result.ok) successCount += 1;
      }

      setImportMessage(`Đã import ${successCount}/${lines.length} bản ghi.`);
      router.refresh();
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Không đọc được file CSV.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className="personnel-catalog-panel personnel-title-catalog-panel internal-penalty-panel" aria-labelledby="internal-penalty-page-title">
      <header className="personnel-catalog-header">
        <div className="internal-penalty-heading">
          <h2 className={selectedIds.length > 0 ? "sr-only" : undefined} id="internal-penalty-page-title">Phạt nội bộ</h2>
          {selectedIds.length > 0 ? (
            <button
              className="internal-penalty-delete-action"
              disabled={isDeleting}
              type="button"
              aria-label={`Xóa ${selectedIds.length} phạt nội bộ đã chọn`}
              onClick={deleteSelectedPenalties}
            >
              <Trash size={16} weight="duotone" aria-hidden="true" />
              {isDeleting ? "Đang xóa" : "Xóa"}
            </button>
          ) : null}
        </div>
        <div className="personnel-catalog-actions">
          <button type="button" onClick={() => setIsDialogOpen(true)}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Tạo mới
          </button>
          <button type="button" onClick={exportPenalties}>
            <Export size={16} weight="duotone" aria-hidden="true" />
            Export
          </button>
          <button type="button" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
            <UploadSimple size={16} weight="duotone" aria-hidden="true" />
            {isImporting ? "Đang import" : "Import"}
          </button>
          <input ref={fileInputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={importPenalties} />
        </div>
      </header>

      {deleteMessage ? <p className="personnel-catalog-message is-error" role="alert">{deleteMessage}</p> : null}
      {importMessage ? <p className="personnel-catalog-message" role="status">{importMessage}</p> : null}
      {data.source === "unavailable" ? (
        <StateBlock tone="error" title="Chưa kết nối được API phạt nội bộ">
          {data.error ?? "Hãy bật API server rồi tải lại trang."}
        </StateBlock>
      ) : visiblePenalties.length === 0 ? (
        <div className="personnel-level-empty workplace-empty">
          <FileText size={32} weight="duotone" aria-hidden="true" />
          <span>Không tìm thấy kết quả nào</span>
        </div>
      ) : (
        <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Bảng phạt nội bộ có thể cuộn ngang">
          <table className="personnel-catalog-table internal-penalty-table">
            <thead>
              <tr>
                <th scope="col">
                  <FormCheckbox
                    label={<span className="sr-only">Chọn tất cả phạt nội bộ</span>}
                    checked={allVisibleSelected}
                    onChange={() => setSelectedIds(allVisibleSelected ? [] : visiblePenalties.map((penalty) => penalty.id))}
                  />
                </th>
                <th scope="col">Người tạo</th>
                <th scope="col">Lỗi vi phạm</th>
                <th scope="col">Số tiền</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {visiblePenalties.map((penalty) => (
                <tr className={penalty.status === "archived" ? "is-archived" : undefined} key={penalty.id}>
                  <td>
                    <FormCheckbox
                      label={<span className="sr-only">Chọn {penalty.violation}</span>}
                      checked={selectedIds.includes(penalty.id)}
                      onChange={() => setSelectedIds((current) => current.includes(penalty.id)
                        ? current.filter((id) => id !== penalty.id)
                        : [...current, penalty.id])}
                    />
                  </td>
                  <td>
                    <span className="internal-penalty-creator" title={penalty.createdBy?.fullName ?? "Admin"}>
                      {creatorInitials(penalty)}
                    </span>
                  </td>
                  <td>
                    <strong>{penalty.violation}</strong>
                    <small>{formatCreatedAt(penalty.createdAt)}</small>
                  </td>
                  <td className="internal-penalty-amount">{formatAmount(penalty.amount)}</td>
                  <td><span className="internal-penalty-status">{penalty.status === "active" ? "Hoạt động" : "Không hoạt động"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isDialogOpen ? <InternalPenaltyDialog onClose={() => setIsDialogOpen(false)} /> : null}
    </section>
  );
}
