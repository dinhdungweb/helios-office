"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormCheckbox } from "@/components/ui/form-controls";
import { FormField, FormInput, ModalDialog, StateBlock } from "@/components/ui/primitives";
import { createWelfareBenefitAction, deleteWelfareBenefitsAction, type WelfareBenefitFormState } from "@/lib/welfare-benefit-actions";
import type { WelfareBenefitData, WelfareBenefitRecord } from "@/lib/welfare-benefit-api";
import { datedCsvFilename, exportCsv } from "@/lib/csv-export";
import { Export, FileText, Plus, Trash, X } from "@/lib/icons";

type BenefitRow = {
  id: string;
  name: string;
  amount: string;
  description: string;
};

const initialState: WelfareBenefitFormState = { ok: false };
const emptyRow = (id: string): BenefitRow => ({ id, name: "", amount: "0", description: "" });

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

function creatorInitials(benefit: WelfareBenefitRecord) {
  return benefit.createdBy?.fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "A";
}

function WelfareBenefitDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const router = useRouter();
  const [rows, setRows] = useState<BenefitRow[]>([emptyRow("benefit-row-1")]);
  const [state, formAction, isPending] = useActionState(createWelfareBenefitAction, initialState);

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

  const updateRow = (id: string, field: keyof Omit<BenefitRow, "id">, value: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  };

  const removeRow = (id: string) => {
    setRows((current) => current.length === 1 ? [emptyRow(current[0].id)] : current.filter((row) => row.id !== id));
  };

  const addRow = () => {
    setRows((current) => [...current, emptyRow(`benefit-row-${crypto.randomUUID()}`)]);
  };

  return (
    <ModalDialog
      className="position-catalog-dialog internal-penalty-dialog welfare-benefit-dialog"
      ref={dialogRef}
      title="Tạo mới Chế độ phúc lợi"
      onCloseRequest={onClose}
    >
      <form className="account-dialog-form internal-penalty-dialog-form welfare-benefit-dialog-form position-catalog-dialog-form" action={formAction}>
        <div className="internal-penalty-create-rows welfare-benefit-create-rows">
          {rows.map((row) => (
            <div className="internal-penalty-create-row welfare-benefit-create-row" key={row.id}>
              <FormField label={<>Tên phúc lợi <b>*</b></>}>
                <FormInput
                  name="name"
                  placeholder="Nhập tên phúc lợi"
                  required
                  minLength={2}
                  value={row.name}
                  onChange={(event) => updateRow(row.id, "name", event.target.value)}
                />
              </FormField>
              <FormField label={<>Số tiền <b>*</b></>}>
                <FormInput
                  inputMode="numeric"
                  name="amount"
                  placeholder="0"
                  required
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
              <button className="personnel-title-remove-row" type="button" aria-label="Xóa dòng chế độ phúc lợi" onClick={() => removeRow(row.id)}>
                <X size={19} weight="duotone" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <button className="personnel-title-add-row" type="button" aria-label="Thêm dòng chế độ phúc lợi" onClick={addRow}>
          <Plus size={17} weight="duotone" aria-hidden="true" />
        </button>

        {state.error ? <p className="account-dialog-error" role="alert">{state.error}</p> : null}
        <div className="account-dialog-actions internal-penalty-dialog-actions welfare-benefit-dialog-actions position-catalog-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>HỦY BỎ</button>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

export function WelfareBenefitSettingsBoard({ data, query = "" }: { data: WelfareBenefitData; query?: string }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const normalizedQuery = normalizeSearch(query);
  const visibleBenefits = useMemo(() => {
    if (!normalizedQuery) return data.benefits;

    return data.benefits.filter((benefit) => [
      benefit.name,
      benefit.description ?? "",
      benefit.createdBy?.fullName ?? "",
      String(benefit.amount)
    ].some((value) => normalizeSearch(value).includes(normalizedQuery)));
  }, [data.benefits, normalizedQuery]);

  const allVisibleSelected = visibleBenefits.length > 0 && visibleBenefits.every((benefit) => selectedIds.includes(benefit.id));

  const deleteSelectedBenefits = () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(`Xóa ${selectedIds.length} chế độ phúc lợi đã chọn? Thao tác này không thể hoàn tác.`);
    if (!confirmed) return;

    setDeleteMessage(null);
    startDeleteTransition(async () => {
      const result = await deleteWelfareBenefitsAction(selectedIds);
      if (!result.ok) {
        setDeleteMessage(result.error ?? "Không xóa được chế độ phúc lợi.");
        return;
      }

      setSelectedIds([]);
      router.refresh();
    });
  };

  const exportBenefits = () => {
    exportCsv({
      filename: datedCsvFilename("che-do-phuc-loi"),
      rows: visibleBenefits,
      columns: [
        { header: "Người tạo", value: (benefit) => benefit.createdBy?.fullName ?? "" },
        { header: "Tên phúc lợi", value: (benefit) => benefit.name },
        { header: "Số tiền", value: (benefit) => benefit.amount },
        { header: "Mô tả", value: (benefit) => benefit.description ?? "" },
        { header: "Trạng thái", value: (benefit) => benefit.status === "active" ? "Hoạt động" : "Không hoạt động" }
      ]
    });
  };

  return (
    <section className="personnel-catalog-panel personnel-title-catalog-panel internal-penalty-panel welfare-benefit-panel" aria-labelledby="welfare-benefit-page-title">
      <header className="personnel-catalog-header personnel-title-catalog-header">
        {selectedIds.length > 0 ? (
          <div className="personnel-catalog-selection-heading">
            <h2 className="sr-only" id="welfare-benefit-page-title">Chế độ phúc lợi</h2>
            <button
              className="personnel-catalog-selection-action"
              disabled={isDeleting}
              type="button"
              aria-label={`Xóa ${selectedIds.length} chế độ phúc lợi đã chọn`}
              onClick={deleteSelectedBenefits}
            >
              <Trash size={16} weight="duotone" aria-hidden="true" />
              {isDeleting ? "Đang xóa" : "Xóa"}
            </button>
          </div>
        ) : (
          <div className="personnel-title-tabs" role="tablist" aria-label="Danh mục phúc lợi">
            <a
              aria-selected="true"
              className="is-active"
              href="/admin/settings/welfare-benefits"
              id="welfare-benefit-page-title"
              role="tab"
            >
              Chế độ phúc lợi
            </a>
            <a aria-selected="false" href="/admin/settings/welfare-packages" role="tab">Gói phúc lợi</a>
          </div>
        )}
        <div className="personnel-catalog-actions">
          <button type="button" onClick={() => setIsDialogOpen(true)}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Tạo mới
          </button>
          <button type="button" onClick={exportBenefits}>
            <Export size={16} weight="duotone" aria-hidden="true" />
            Export
          </button>
        </div>
      </header>

      {deleteMessage ? <p className="personnel-catalog-message is-error" role="alert">{deleteMessage}</p> : null}
      {data.source === "unavailable" ? (
        <StateBlock tone="error" title="Chưa kết nối được API chế độ phúc lợi">
          {data.error ?? "Hãy bật API server rồi tải lại trang."}
        </StateBlock>
      ) : visibleBenefits.length === 0 ? (
        <div className="personnel-level-empty workplace-empty">
          <FileText size={32} weight="duotone" aria-hidden="true" />
          <span>Không tìm thấy kết quả nào</span>
        </div>
      ) : (
        <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Bảng chế độ phúc lợi có thể cuộn ngang">
          <table className="personnel-catalog-table internal-penalty-table welfare-benefit-table">
            <thead>
              <tr>
                <th scope="col">
                  <FormCheckbox
                    label={<span className="sr-only">Chọn tất cả chế độ phúc lợi</span>}
                    checked={allVisibleSelected}
                    onChange={() => setSelectedIds(allVisibleSelected ? [] : visibleBenefits.map((benefit) => benefit.id))}
                  />
                </th>
                <th scope="col">Người tạo</th>
                <th scope="col">Tên phúc lợi</th>
                <th scope="col">Số tiền</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {visibleBenefits.map((benefit) => (
                <tr className={benefit.status === "archived" ? "is-archived" : undefined} key={benefit.id}>
                  <td>
                    <FormCheckbox
                      label={<span className="sr-only">Chọn {benefit.name}</span>}
                      checked={selectedIds.includes(benefit.id)}
                      onChange={() => setSelectedIds((current) => current.includes(benefit.id)
                        ? current.filter((id) => id !== benefit.id)
                        : [...current, benefit.id])}
                    />
                  </td>
                  <td>
                    <span className="internal-penalty-creator welfare-benefit-creator" title={benefit.createdBy?.fullName ?? "Admin"}>
                      {creatorInitials(benefit)}
                    </span>
                  </td>
                  <td>
                    <strong>{benefit.name}</strong>
                    <small>{formatCreatedAt(benefit.createdAt)}</small>
                  </td>
                  <td className="internal-penalty-amount">{formatAmount(benefit.amount)}</td>
                  <td><span className="internal-penalty-status">{benefit.status === "active" ? "Hoạt động" : "Không hoạt động"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isDialogOpen ? <WelfareBenefitDialog onClose={() => setIsDialogOpen(false)} /> : null}
    </section>
  );
}
