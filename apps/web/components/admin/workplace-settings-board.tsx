"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FormCheckbox } from "@/components/ui/form-controls";
import { FormInput, ModalDialog, StateBlock } from "@/components/ui/primitives";
import { createWorkplaceAction, deleteWorkplacesAction, type WorkplaceFormState } from "@/lib/workplace-actions";
import type { WorkplaceData, WorkplaceDepartment } from "@/lib/workplace-api";
import { datedCsvFilename, exportCsv } from "@/lib/csv-export";
import { CaretDown, Export, FileText, MagnifyingGlass, Plus, Trash, UploadSimple } from "@/lib/icons";

const initialState: WorkplaceFormState = { ok: false };

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("vi");
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

function WorkplaceDialog({
  departments,
  onClose
}: {
  departments: WorkplaceDepartment[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [state, formAction, isPending] = useActionState(createWorkplaceAction, initialState);

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
    if (state.ok) onClose();
  }, [onClose, state.ok]);

  return (
    <ModalDialog
      className="position-catalog-dialog workplace-dialog"
      ref={dialogRef}
      title="Tạo mới nơi làm việc"
      onCloseRequest={onClose}
    >
      <form className="account-dialog-form workplace-dialog-form" action={formAction}>
        <div className="workplace-dialog-fields">
          <FormInput aria-label="Nơi làm việc" name="name" placeholder="Nơi làm việc" required minLength={2} />
          <FormInput aria-label="Địa chỉ số nhà" name="addressLine" placeholder="Địa chỉ (Số nhà)" />
          <span className="workplace-address-search">
            <FormInput
              aria-label="Xã phường, Quận huyện, Tỉnh thành"
              name="administrativeArea"
              placeholder="Xã phường, Quận huyện, Tỉnh thành"
            />
            <MagnifyingGlass size={19} weight="duotone" aria-hidden="true" />
          </span>
          <label className="workplace-department-select">
            <span>Phòng ban</span>
            <select defaultValue="" name="departmentId">
              <option value="">Chọn phòng ban</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
            <CaretDown size={18} weight="duotone" aria-hidden="true" />
          </label>
        </div>

        {state.error ? <p className="account-dialog-error">{state.error}</p> : null}
        <div className="account-dialog-actions position-catalog-dialog-actions workplace-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>HỦY BỎ</button>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

export function WorkplaceSettingsBoard({ data, query = "" }: { data: WorkplaceData; query?: string }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = normalizeSearch(query);
  const visibleWorkplaces = useMemo(() => {
    if (!normalizedQuery) return data.workplaces;

    return data.workplaces.filter((workplace) => [
      workplace.name,
      workplace.addressLine ?? "",
      workplace.administrativeArea ?? "",
      workplace.department?.name ?? ""
    ].some((value) => normalizeSearch(value).includes(normalizedQuery)));
  }, [data.workplaces, normalizedQuery]);
  const visibleIds = visibleWorkplaces.map((workplace) => workplace.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const toggleAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleWorkplace = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelectedWorkplaces = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Xóa ${selectedIds.size} nơi làm việc đã chọn? Thao tác này không thể hoàn tác.`)) return;

    setDeleteMessage(null);
    startDeleteTransition(async () => {
      const result = await deleteWorkplacesAction([...selectedIds]);
      if (!result.ok) {
        setDeleteMessage(result.error ?? "Không xóa được nơi làm việc.");
        return;
      }

      setSelectedIds(new Set());
      router.refresh();
    });
  };

  const exportWorkplaces = () => {
    exportCsv({
      filename: datedCsvFilename("noi-lam-viec"),
      rows: visibleWorkplaces,
      columns: [
        { header: "Nơi làm việc", value: (workplace) => workplace.name },
        { header: "Địa chỉ", value: (workplace) => workplace.addressLine ?? "" },
        { header: "Khu vực hành chính", value: (workplace) => workplace.administrativeArea ?? "" },
        { header: "Phòng ban", value: (workplace) => workplace.department?.name ?? "" }
      ]
    });
  };

  const importWorkplaces = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);

    try {
      const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim().length > 0);
      const header = splitCsvRow(lines.shift() ?? "").map(normalizeSearch);
      const nameIndex = header.findIndex((value) => value === "nơi làm việc" || value === "tên");
      const addressIndex = header.indexOf("địa chỉ");
      const areaIndex = header.indexOf("khu vực hành chính");
      const departmentIndex = header.indexOf("phòng ban");

      if (nameIndex < 0) throw new Error("CSV cần có cột Nơi làm việc.");

      let successCount = 0;
      for (const line of lines) {
        const values = splitCsvRow(line);
        const formData = new FormData();
        const departmentName = departmentIndex >= 0 ? values[departmentIndex] ?? "" : "";
        const department = data.departments.find((item) => normalizeSearch(item.name) === normalizeSearch(departmentName));

        formData.set("name", values[nameIndex] ?? "");
        formData.set("addressLine", addressIndex >= 0 ? values[addressIndex] ?? "" : "");
        formData.set("administrativeArea", areaIndex >= 0 ? values[areaIndex] ?? "" : "");
        formData.set("departmentId", department?.id ?? "");

        const result = await createWorkplaceAction(initialState, formData);
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
    <section className="personnel-catalog-panel personnel-title-catalog-panel workplace-catalog-panel" aria-labelledby="workplace-page-title">
      <header className="personnel-catalog-header">
        {selectedIds.size > 0 ? (
          <div className="personnel-catalog-selection-heading">
            <h2 className="sr-only" id="workplace-page-title">Nơi làm việc</h2>
            <button
              className="personnel-catalog-selection-action"
              disabled={isDeleting}
              type="button"
              aria-label={`Xóa ${selectedIds.size} nơi làm việc đã chọn`}
              onClick={deleteSelectedWorkplaces}
            >
              <Trash size={16} weight="duotone" aria-hidden="true" />
              {isDeleting ? "Đang xóa" : "Xóa"}
            </button>
          </div>
        ) : <h2 id="workplace-page-title">Nơi làm việc</h2>}
        <div className="personnel-catalog-actions">
          <button type="button" onClick={() => setIsDialogOpen(true)}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Tạo mới
          </button>
          <button type="button" onClick={exportWorkplaces}>
            <Export size={16} weight="duotone" aria-hidden="true" />
            Export
          </button>
          <button type="button" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
            <UploadSimple size={16} weight="duotone" aria-hidden="true" />
            {isImporting ? "Đang import" : "Import"}
          </button>
          <input ref={fileInputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={importWorkplaces} />
        </div>
      </header>

      {deleteMessage ? <p className="personnel-catalog-message is-error" role="alert">{deleteMessage}</p> : null}
      {importMessage ? <p className="personnel-catalog-message" role="status">{importMessage}</p> : null}
      {data.source === "unavailable" ? (
        <StateBlock tone="error" title="Chưa kết nối được API nơi làm việc">
          {data.error ?? "Hãy bật API server rồi tải lại trang."}
        </StateBlock>
      ) : visibleWorkplaces.length === 0 ? (
        <div className="personnel-level-empty workplace-empty">
          <FileText size={32} weight="duotone" aria-hidden="true" />
          <span>Không tìm thấy kết quả nào</span>
        </div>
      ) : (
        <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Bảng nơi làm việc có thể cuộn ngang">
          <table className="personnel-catalog-table workplace-catalog-table">
            <thead>
              <tr>
                <th scope="col">
                  <FormCheckbox
                    checked={allVisibleSelected}
                    label={<span className="sr-only">Chọn tất cả nơi làm việc</span>}
                    onChange={toggleAll}
                  />
                </th>
                <th scope="col">Nơi làm việc</th>
                <th scope="col">Địa chỉ</th>
                <th scope="col">Khu vực hành chính</th>
                <th scope="col">Phòng ban</th>
              </tr>
            </thead>
            <tbody>
              {visibleWorkplaces.map((workplace) => (
                <tr className={workplace.status === "archived" ? "is-archived" : undefined} key={workplace.id}>
                  <td>
                    <FormCheckbox
                      checked={selectedIds.has(workplace.id)}
                      label={<span className="sr-only">Chọn {workplace.name}</span>}
                      onChange={() => toggleWorkplace(workplace.id)}
                    />
                  </td>
                  <td>{workplace.name}</td>
                  <td>{workplace.addressLine || "--"}</td>
                  <td>{workplace.administrativeArea || "--"}</td>
                  <td>{workplace.department?.name || "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isDialogOpen ? <WorkplaceDialog departments={data.departments} onClose={() => setIsDialogOpen(false)} /> : null}
    </section>
  );
}
