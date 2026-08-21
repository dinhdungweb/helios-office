"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormCheckbox } from "@/components/ui/form-controls";
import { FormInput, ModalDialog, StateBlock } from "@/components/ui/primitives";
import type { PositionTitleData } from "@/lib/position-title-api";
import type { WelfareBenefitData } from "@/lib/welfare-benefit-api";
import { createWelfarePackageAction, deleteWelfarePackagesAction, type WelfarePackageFormState } from "@/lib/welfare-package-actions";
import type { WelfarePackageData, WelfarePackageRecord } from "@/lib/welfare-package-api";
import { datedCsvFilename, exportCsv } from "@/lib/csv-export";
import { CalendarBlank, CaretDown, Export, FileText, Plus, Trash, X } from "@/lib/icons";

type PackageItemRow = {
  id: string;
  benefitId: string;
  amount: string;
  paymentMethod: string;
};

type PackageCatalog = {
  positions: PositionTitleData["positions"];
  titles: PositionTitleData["titles"];
  levels: PositionTitleData["levels"];
  benefits: WelfareBenefitData["benefits"];
};

const initialState: WelfarePackageFormState = { ok: false };
const emptyItemRow = (id: string): PackageItemRow => ({ id, benefitId: "", amount: "", paymentMethod: "" });

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("vi");
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : new Intl.DateTimeFormat("vi-VN").format(date);
}

function formatPeriod(item: WelfarePackageRecord) {
  if (!item.startDate && !item.endDate) return "Không giới hạn";
  return `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`;
}

function creatorInitials(item: WelfarePackageRecord) {
  return item.createdBy?.fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "A";
}

function WelfarePackageDialog({ catalog, onClose }: { catalog: PackageCatalog; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState<PackageItemRow[]>([emptyItemRow("package-item-1")]);
  const [state, formAction, isPending] = useActionState(createWelfarePackageAction, initialState);
  const activePositions = catalog.positions.filter((item) => item.status === "active");
  const activeTitles = catalog.titles.filter((item) => item.status === "active");
  const activeLevels = catalog.levels.filter((item) => item.status === "active");
  const activeBenefits = catalog.benefits.filter((item) => item.status === "active");

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

  const updateRow = (id: string, field: keyof Omit<PackageItemRow, "id">, value: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  };

  const removeRow = (id: string) => {
    setRows((current) => current.length === 1 ? [emptyItemRow(current[0].id)] : current.filter((row) => row.id !== id));
  };

  return (
    <ModalDialog
      className="position-catalog-dialog welfare-package-dialog"
      ref={dialogRef}
      title="Tạo mới Gói phúc lợi"
      onCloseRequest={onClose}
    >
      <form className="account-dialog-form position-catalog-dialog-form welfare-package-dialog-form" action={formAction}>
        <div className="welfare-package-main-fields">
          <FormInput aria-label="Tên gói phúc lợi" name="name" placeholder="Tên gói phúc lợi *" required minLength={2} />

          <div className="welfare-package-date-grid">
            <label className={startDate ? "welfare-package-date-field is-filled" : "welfare-package-date-field"}>
              <span className="sr-only">Từ ngày</span>
              <input type="date" value={startDate} onInput={(event) => setStartDate(event.currentTarget.value)} />
              <input name="startDate" type="hidden" value={startDate} />
              <span aria-hidden="true">Từ ngày</span>
              <CalendarBlank size={18} weight="duotone" aria-hidden="true" />
            </label>
            <label className={endDate ? "welfare-package-date-field is-filled" : "welfare-package-date-field"}>
              <span className="sr-only">Đến ngày</span>
              <input type="date" value={endDate} onInput={(event) => setEndDate(event.currentTarget.value)} />
              <input name="endDate" type="hidden" value={endDate} />
              <span aria-hidden="true">Đến ngày</span>
              <CalendarBlank size={18} weight="duotone" aria-hidden="true" />
            </label>
          </div>

          <label className="welfare-package-select">
            <span className="sr-only">Vị trí áp dụng</span>
            <select defaultValue="" name="positionId">
              <option value="">Vị trí áp dụng</option>
              {activePositions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <CaretDown size={17} aria-hidden="true" />
          </label>
          <label className="welfare-package-select">
            <span className="sr-only">Chức vụ</span>
            <select defaultValue="" name="jobTitleId">
              <option value="">Chức vụ</option>
              {activeTitles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <CaretDown size={17} aria-hidden="true" />
          </label>
          <label className="welfare-package-select">
            <span className="sr-only">Cấp bậc</span>
            <select defaultValue="" name="jobLevelId">
              <option value="">Cấp bậc</option>
              {activeLevels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <CaretDown size={17} aria-hidden="true" />
          </label>
          <FormInput aria-label="Mô tả" name="description" placeholder="Mô tả" />
        </div>

        <div className="welfare-package-item-labels" aria-hidden="true">
          <span>Phụ cấp</span>
          <span>Số tiền <b>*</b></span>
          <span>Hình thức</span>
          <span />
        </div>
        <div className="welfare-package-item-rows">
          {rows.map((row) => (
            <div className="welfare-package-item-row" key={row.id}>
              <label className="welfare-package-select">
                <span className="sr-only">Phụ cấp</span>
                <select name="benefitId" value={row.benefitId} onChange={(event) => updateRow(row.id, "benefitId", event.target.value)}>
                  <option value="">{activeBenefits.length > 0 ? "Phụ cấp" : "Chưa có phụ cấp"}</option>
                  {activeBenefits.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <CaretDown size={17} aria-hidden="true" />
              </label>
              <FormInput
                aria-label="Số tiền"
                inputMode="numeric"
                name="itemAmount"
                placeholder="Số tiền"
                required
                value={row.amount}
                onChange={(event) => updateRow(row.id, "amount", event.target.value.replace(/[^\d,.]/g, ""))}
              />
              <label className="welfare-package-select">
                <span className="sr-only">Hình thức</span>
                <select name="paymentMethod" value={row.paymentMethod} onChange={(event) => updateRow(row.id, "paymentMethod", event.target.value)}>
                  <option value="">Chọn hình thức</option>
                  <option value="monthly">Theo tháng</option>
                  <option value="one_time">Một lần</option>
                  <option value="workday">Theo ngày công</option>
                </select>
                <CaretDown size={17} aria-hidden="true" />
              </label>
              <button className="personnel-title-remove-row" type="button" aria-label="Xóa dòng phụ cấp" onClick={() => removeRow(row.id)}>
                <X size={19} weight="duotone" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <button
          className="personnel-title-add-row"
          type="button"
          aria-label="Thêm dòng phụ cấp"
          onClick={() => setRows((current) => [...current, emptyItemRow(`package-item-${crypto.randomUUID()}`)])}
        >
          <Plus size={17} weight="duotone" aria-hidden="true" />
        </button>

        {state.error ? <p className="account-dialog-error" role="alert">{state.error}</p> : null}
        <div className="account-dialog-actions position-catalog-dialog-actions welfare-package-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>HỦY BỎ</button>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

export function WelfarePackageSettingsBoard({
  catalog,
  data,
  query = ""
}: {
  catalog: PackageCatalog;
  data: WelfarePackageData;
  query?: string;
}) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const normalizedQuery = normalizeSearch(query);
  const visiblePackages = useMemo(() => {
    if (!normalizedQuery) return data.packages;
    return data.packages.filter((item) => [
      item.name,
      item.description ?? "",
      item.position?.name ?? "",
      item.jobTitle?.name ?? "",
      item.jobLevel?.name ?? "",
      item.createdBy?.fullName ?? ""
    ].some((value) => normalizeSearch(value).includes(normalizedQuery)));
  }, [data.packages, normalizedQuery]);
  const allVisibleSelected = visiblePackages.length > 0 && visiblePackages.every((item) => selectedIds.includes(item.id));

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Xóa ${selectedIds.length} gói phúc lợi đã chọn? Thao tác này không thể hoàn tác.`)) return;
    setDeleteMessage(null);
    startDeleteTransition(async () => {
      const result = await deleteWelfarePackagesAction(selectedIds);
      if (!result.ok) {
        setDeleteMessage(result.error ?? "Không xóa được gói phúc lợi.");
        return;
      }
      setSelectedIds([]);
      router.refresh();
    });
  };

  const exportPackages = () => {
    exportCsv({
      filename: datedCsvFilename("goi-phuc-loi"),
      rows: visiblePackages,
      columns: [
        { header: "Người tạo", value: (item) => item.createdBy?.fullName ?? "" },
        { header: "Tên gói phúc lợi", value: (item) => item.name },
        { header: "Từ ngày", value: (item) => formatDate(item.startDate) },
        { header: "Đến ngày", value: (item) => formatDate(item.endDate) },
        { header: "Vị trí", value: (item) => item.position?.name ?? "" },
        { header: "Chức vụ", value: (item) => item.jobTitle?.name ?? "" },
        { header: "Cấp bậc", value: (item) => item.jobLevel?.name ?? "" },
        { header: "Tổng tiền", value: (item) => item.items.reduce((sum, row) => sum + row.amount, 0) }
      ]
    });
  };

  return (
    <section className="personnel-catalog-panel personnel-title-catalog-panel welfare-package-panel" aria-labelledby="welfare-package-page-title">
      <header className="personnel-catalog-header personnel-title-catalog-header">
        {selectedIds.length > 0 ? (
          <div className="personnel-catalog-selection-heading">
            <h2 className="sr-only" id="welfare-package-page-title">Gói phúc lợi</h2>
            <button className="personnel-catalog-selection-action" disabled={isDeleting} type="button" onClick={deleteSelected}>
              <Trash size={16} weight="duotone" aria-hidden="true" />
              {isDeleting ? "Đang xóa" : "Xóa"}
            </button>
          </div>
        ) : (
          <div className="personnel-title-tabs" role="tablist" aria-label="Danh mục phúc lợi">
            <a aria-selected="false" href="/admin/settings/welfare-benefits" role="tab">Chế độ phúc lợi</a>
            <a aria-selected="true" className="is-active" href="/admin/settings/welfare-packages" id="welfare-package-page-title" role="tab">Gói phúc lợi</a>
          </div>
        )}
        <div className="personnel-catalog-actions">
          <button type="button" onClick={() => setIsDialogOpen(true)}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Tạo mới
          </button>
          <button type="button" onClick={exportPackages}>
            <Export size={16} weight="duotone" aria-hidden="true" />
            Export
          </button>
        </div>
      </header>

      {deleteMessage ? <p className="personnel-catalog-message is-error" role="alert">{deleteMessage}</p> : null}
      {data.source === "unavailable" ? (
        <StateBlock tone="error" title="Chưa kết nối được API gói phúc lợi">
          {data.error ?? "Hãy bật API server rồi tải lại trang."}
        </StateBlock>
      ) : visiblePackages.length === 0 ? (
        <div className="personnel-level-empty workplace-empty">
          <FileText size={32} weight="duotone" aria-hidden="true" />
          <span>Không tìm thấy kết quả nào</span>
        </div>
      ) : (
        <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Bảng gói phúc lợi có thể cuộn ngang">
          <table className="personnel-catalog-table welfare-package-table">
            <thead>
              <tr>
                <th scope="col"><FormCheckbox label={<span className="sr-only">Chọn tất cả gói phúc lợi</span>} checked={allVisibleSelected} onChange={() => setSelectedIds(allVisibleSelected ? [] : visiblePackages.map((item) => item.id))} /></th>
                <th scope="col">Người tạo</th>
                <th scope="col">Tên gói phúc lợi</th>
                <th scope="col">Thời hạn</th>
                <th scope="col">Số tiền</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {visiblePackages.map((item) => (
                <tr key={item.id}>
                  <td><FormCheckbox label={<span className="sr-only">Chọn {item.name}</span>} checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /></td>
                  <td><span className="internal-penalty-creator" title={item.createdBy?.fullName ?? "Admin"}>{creatorInitials(item)}</span></td>
                  <td><strong>{item.name}</strong><small>{item.items.length} phụ cấp</small></td>
                  <td>{formatPeriod(item)}</td>
                  <td className="internal-penalty-amount">{formatAmount(item.items.reduce((sum, row) => sum + row.amount, 0))}</td>
                  <td><span className="internal-penalty-status">{item.status === "active" ? "Hoạt động" : "Không hoạt động"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isDialogOpen ? <WelfarePackageDialog catalog={catalog} onClose={() => setIsDialogOpen(false)} /> : null}
    </section>
  );
}
