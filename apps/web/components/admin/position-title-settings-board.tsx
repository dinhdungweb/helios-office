"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FormCheckbox, FormSelect } from "@/components/ui/form-controls";
import { FormField, FormInput, FormTextarea, ModalDialog, StateBlock } from "@/components/ui/primitives";
import {
  archivePositionAction,
  archiveTitleAction,
  createJobLevelAction,
  createPositionAction,
  createTitleAction,
  deleteCatalogItemsAction,
  restorePositionAction,
  restoreTitleAction,
  updatePositionAction,
  updateTitleAction,
  type CatalogFormState
} from "@/lib/position-title-actions";
import type { JobLevelRecord, JobPositionRecord, JobTitleRecord, PositionTitleData } from "@/lib/position-title-api";
import type { PermissionGroup } from "@/lib/account-access-api";
import { datedCsvFilename, exportCsv } from "@/lib/csv-export";
import { Archive, ArchiveRestore, CaretDown, CaretRight, Export, FileText, PencilSimple, Plus, Trash, UploadSimple, X } from "@/lib/icons";

type CatalogKind = "position" | "title";
type CatalogView = CatalogKind | "level";
type CatalogItem = JobPositionRecord | JobTitleRecord;

const initialState: CatalogFormState = { ok: false };

function CatalogDialog({
  item,
  kind,
  mode,
  onClose,
  levels,
  permissionGroups,
  positions,
  titles
}: {
  item?: CatalogItem;
  kind: CatalogKind;
  mode: "create" | "edit";
  onClose: () => void;
  levels: JobLevelRecord[];
  permissionGroups: PermissionGroup[];
  positions: JobPositionRecord[];
  titles: JobTitleRecord[];
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const nextTitleRowId = useRef(1);
  const [titleRows, setTitleRows] = useState(() => [{ id: 0 }]);
  const action = kind === "position"
    ? mode === "create" ? createPositionAction : updatePositionAction
    : mode === "create" ? createTitleAction : updateTitleAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const title = kind === "title" && mode === "create"
    ? "Tạo mới Chức vụ"
    : `${mode === "create" ? "Tạo" : "Sửa"} ${kind === "position" ? "vị trí công việc" : "chức vụ"}`;
  const activeLevels = levels.filter((level) => level.status === "active");

  const addTitleRow = () => {
    const id = nextTitleRowId.current;
    nextTitleRowId.current += 1;
    setTitleRows((current) => [...current, { id }]);
  };

  const removeTitleRow = (id: number) => {
    setTitleRows((current) => {
      if (current.length > 1) return current.filter((row) => row.id !== id);

      const replacementId = nextTitleRowId.current;
      nextTitleRowId.current += 1;
      return [{ id: replacementId }];
    });
  };

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
      className={kind === "position"
        ? "org-department-dialog org-department-dialog--quick position-catalog-dialog"
        : mode === "create"
          ? "position-catalog-dialog personnel-title-create-dialog"
          : "position-catalog-dialog"}
      ref={dialogRef}
      title={title}
      onCloseRequest={onClose}
    >
      <form
        className={kind === "position"
          ? "account-dialog-form org-department-form position-catalog-dialog-form"
          : mode === "create"
            ? "account-dialog-form position-catalog-dialog-form personnel-title-create-form"
            : "account-dialog-form position-catalog-dialog-form"}
        action={formAction}
      >
        {item ? <input name="id" type="hidden" value={item.id} /> : null}
        {kind === "position" ? (
          <div className="account-dialog-grid org-department-form-grid personnel-position-dialog-grid">
            <FormField label="Mã">
              <FormInput name="code" required minLength={2} defaultValue={item?.code ?? ""} placeholder="Mã" />
            </FormField>
            <FormField label={<>Tên vị trí <b aria-hidden="true">*</b></>}>
              <FormInput name="name" required minLength={2} defaultValue={item?.name ?? ""} placeholder="Tên vị trí" />
            </FormField>

            <FormField label="Vị trí cha" wide>
              <FormSelect
                ariaLabel="Chọn vị trí cha"
                defaultValue=""
                menuLabel="Danh sách vị trí cha"
                name="parentPositionId"
                options={positions
                  .filter((position) => position.id !== item?.id && position.status === "active")
                  .map((position) => ({ label: position.name, value: position.id }))}
                placeholder="Vị trí cha"
              />
            </FormField>

            <FormField label="Chức vụ tương ứng" wide>
              <FormSelect
                ariaLabel="Chọn chức vụ tương ứng"
                defaultValue={(item as JobPositionRecord | undefined)?.family ?? ""}
                menuLabel="Danh sách chức vụ"
                name="family"
                options={titles
                  .filter((jobTitle) => jobTitle.status === "active")
                  .map((jobTitle) => ({ label: jobTitle.name, value: jobTitle.name }))}
                placeholder="Chức vụ tương ứng"
              />
            </FormField>

            <FormField label="Nhóm quyền" wide>
              <FormSelect
                ariaLabel="Chọn nhóm quyền"
                defaultValue=""
                menuLabel="Danh sách nhóm quyền"
                name="permissionGroupId"
                options={permissionGroups.map((group) => ({ label: group.name, value: group.id }))}
                placeholder="Nhóm quyền"
              />
            </FormField>

            <fieldset className="form-field form-field--wide personnel-position-salary-field">
              <legend>Mức lương</legend>
              <div className="personnel-position-salary">
                <FormInput aria-label="Mức lương từ" name="salaryMin" type="number" min={0} placeholder="Từ" />
                <FormInput aria-label="Mức lương đến" name="salaryMax" type="number" min={0} placeholder="Đến" />
              </div>
            </fieldset>

            <FormField className="org-floating-field" label="Mô tả" wide>
              <FormTextarea name="description" rows={2} defaultValue={item?.description ?? ""} placeholder="Mô tả" />
            </FormField>
          </div>
        ) : mode === "create" ? (
          <div className="personnel-title-create-rows">
            {titleRows.map((row, index) => (
              <div className="personnel-title-create-row" key={row.id}>
                <FormField label="Mã chức vụ">
                  <FormInput name="code" minLength={2} placeholder="Mã chức vụ" />
                </FormField>
                <FormField label={<>Tên chức vụ <b aria-hidden="true">*</b></>}>
                  <FormInput name="name" required minLength={2} placeholder="Nhập tên chức vụ" />
                </FormField>
                <FormField label={<span className="personnel-title-field-label">Thứ tự <i title="Thứ tự dòng nhập">ⓘ</i></span>}>
                  <FormInput aria-label={`Thứ tự dòng ${index + 1}`} readOnly value={index + 1} />
                </FormField>
                <FormField label={<span className="personnel-title-field-label">Cấp bậc <i title="Cấp bậc chức vụ">ⓘ</i></span>}>
                  <span className="personnel-title-rank-select-wrap">
                    <select
                      aria-label={`Chọn cấp bậc cho dòng ${index + 1}`}
                      className="form-input personnel-title-rank-select"
                      defaultValue=""
                      disabled={activeLevels.length === 0}
                      name="levelId"
                    >
                      <option value="">{activeLevels.length === 0 ? "Chưa tạo" : "Cấp bậc"}</option>
                      {activeLevels.map((level) => (
                        <option key={level.id} value={level.id}>{level.name}</option>
                      ))}
                    </select>
                    <CaretDown aria-hidden="true" size={16} />
                  </span>
                </FormField>
                <FormField label="Mô tả">
                  <FormInput name="description" placeholder="Nhập mô tả" />
                </FormField>
                <button
                  className="personnel-title-remove-row"
                  type="button"
                  aria-label={`Xóa dòng chức vụ ${index + 1}`}
                  onClick={() => removeTitleRow(row.id)}
                >
                  <X size={18} weight="duotone" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button className="personnel-title-add-row" type="button" aria-label="Thêm dòng chức vụ" onClick={addTitleRow}>
              <Plus size={17} weight="duotone" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="account-dialog-grid">
            <FormField label="Mã">
              <FormInput name="code" required minLength={2} defaultValue={item?.code ?? ""} placeholder="TTL-MGR" />
            </FormField>
            <FormField label="Tên chức vụ">
              <FormInput name="name" required minLength={2} defaultValue={item?.name ?? ""} />
            </FormField>
            <FormField label="Cấp bậc" wide>
              <span className="personnel-title-rank-select-wrap">
                <select
                  aria-label="Chọn cấp bậc"
                  className="form-input personnel-title-rank-select"
                  defaultValue={(item as JobTitleRecord | undefined)?.levelId ?? ""}
                  disabled={activeLevels.length === 0}
                  name="levelId"
                >
                  <option value="">{activeLevels.length === 0 ? "Chưa tạo" : "Cấp bậc"}</option>
                  {activeLevels.map((level) => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </select>
                <CaretDown aria-hidden="true" size={16} />
              </span>
            </FormField>
            <FormField label="Mô tả" wide>
              <FormTextarea name="description" rows={4} defaultValue={item?.description ?? ""} />
            </FormField>
          </div>
        )}
        {state.error ? <p className="account-dialog-error">{state.error}</p> : null}
        <div className={kind === "position"
          ? "account-dialog-actions org-department-actions position-catalog-dialog-actions"
          : "account-dialog-actions position-catalog-dialog-actions"}
        >
          <button className="secondary-button" type="button" onClick={onClose}>HỦY BỎ</button>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

function JobLevelDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const nextRowId = useRef(1);
  const [rows, setRows] = useState(() => [{ id: 0 }]);
  const [state, formAction, isPending] = useActionState(createJobLevelAction, initialState);

  const addRow = () => {
    const id = nextRowId.current;
    nextRowId.current += 1;
    setRows((current) => [...current, { id }]);
  };

  const removeRow = (id: number) => {
    setRows((current) => {
      if (current.length > 1) return current.filter((row) => row.id !== id);

      const replacementId = nextRowId.current;
      nextRowId.current += 1;
      return [{ id: replacementId }];
    });
  };

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
      className="position-catalog-dialog personnel-level-create-dialog"
      ref={dialogRef}
      title="Tạo mới cấp bậc"
      onCloseRequest={onClose}
    >
      <form className="account-dialog-form personnel-level-create-form" action={formAction}>
        <div className="personnel-level-create-rows">
          {rows.map((row, index) => (
            <div className="personnel-level-create-row" key={row.id}>
              <FormField label={<>Tên cấp bậc <b aria-hidden="true">*</b></>}>
                <FormInput
                  aria-label={`Tên cấp bậc dòng ${index + 1}`}
                  name="name"
                  placeholder="Bậc 1, bậc 2, bậc 3"
                  required
                  minLength={2}
                />
              </FormField>
              <FormField label="Mô tả">
                <FormInput
                  aria-label={`Mô tả cấp bậc dòng ${index + 1}`}
                  name="description"
                  placeholder="Nhập mô tả"
                />
              </FormField>
              <button
                className="personnel-title-remove-row"
                type="button"
                aria-label={`Xóa dòng cấp bậc ${index + 1}`}
                onClick={() => removeRow(row.id)}
              >
                <X size={18} weight="duotone" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button className="personnel-title-add-row" type="button" aria-label="Thêm dòng cấp bậc" onClick={addRow}>
            <Plus size={17} weight="duotone" aria-hidden="true" />
          </button>
        </div>
        {state.error ? <p className="account-dialog-error">{state.error}</p> : null}
        <div className="account-dialog-actions position-catalog-dialog-actions personnel-level-create-actions">
          <button className="secondary-button" type="button" onClick={onClose}>HỦY BỎ</button>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

function JobLevelCatalog({ data, query }: { data: PositionTitleData; query: string }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const normalizedQuery = normalizeSearch(query);
  const visibleLevels = useMemo(() => {
    if (!normalizedQuery) return data.levels;

    return data.levels.filter((level) => [level.name, level.description ?? ""]
      .some((value) => normalizeSearch(value).includes(normalizedQuery)));
  }, [data.levels, normalizedQuery]);
  const visibleIds = visibleLevels.map((level) => level.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const toggleAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleLevel = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelectedLevels = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Xóa ${selectedIds.size} cấp bậc đã chọn? Thao tác này không thể hoàn tác.`)) return;

    setDeleteMessage(null);
    startDeleteTransition(async () => {
      const result = await deleteCatalogItemsAction("level", [...selectedIds]);
      if (!result.ok) {
        setDeleteMessage(result.error ?? "Không xóa được cấp bậc.");
        return;
      }

      setSelectedIds(new Set());
      router.refresh();
    });
  };

  const exportLevels = () => {
    exportCsv({
      filename: datedCsvFilename("cap-bac"),
      rows: visibleLevels,
      columns: [
        { header: "Tên cấp bậc", value: (level) => level.name },
        { header: "Mô tả", value: (level) => level.description ?? "" }
      ]
    });
  };

  return (
    <section className="personnel-catalog-panel personnel-title-catalog-panel" aria-labelledby="personnel-level-tab">
      <header className="personnel-catalog-header personnel-title-catalog-header">
        {selectedIds.size > 0 ? (
          <div className="personnel-catalog-selection-heading">
            <h2 className="sr-only" id="personnel-level-tab">Cấp bậc</h2>
            <button
              className="personnel-catalog-selection-action"
              disabled={isDeleting}
              type="button"
              aria-label={`Xóa ${selectedIds.size} cấp bậc đã chọn`}
              onClick={deleteSelectedLevels}
            >
              <Trash size={16} weight="duotone" aria-hidden="true" />
              {isDeleting ? "Đang xóa" : "Xóa"}
            </button>
          </div>
        ) : (
          <div className="personnel-title-tabs" role="tablist" aria-label="Danh mục chức vụ">
            <a aria-selected="false" href="/admin/settings/job-titles" role="tab">Chức vụ</a>
            <a
              aria-selected="true"
              className="is-active"
              href="/admin/settings/job-levels"
              id="personnel-level-tab"
              role="tab"
            >
              Cấp bậc
            </a>
          </div>
        )}
        <div className="personnel-catalog-actions">
          <button type="button" onClick={() => setIsDialogOpen(true)}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Tạo mới
          </button>
          <button type="button" onClick={exportLevels}>
            <Export size={16} weight="duotone" aria-hidden="true" />
            Export
          </button>
        </div>
      </header>

      {deleteMessage ? <p className="personnel-catalog-message is-error" role="alert">{deleteMessage}</p> : null}

      {data.source === "unavailable" ? (
        <StateBlock tone="error" title="Chưa kết nối được API danh mục">
          {data.error ?? "Hãy bật API server rồi tải lại trang."}
        </StateBlock>
      ) : visibleLevels.length === 0 ? (
        <div className="personnel-level-empty">
          <FileText size={32} weight="duotone" aria-hidden="true" />
          <span>Không tìm thấy kết quả nào</span>
        </div>
      ) : (
        <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Bảng cấp bậc có thể cuộn ngang">
          <table className="personnel-catalog-table personnel-level-catalog-table">
            <thead>
              <tr>
                <th scope="col">
                  <FormCheckbox
                    checked={allVisibleSelected}
                    label={<span className="sr-only">Chọn tất cả cấp bậc</span>}
                    onChange={toggleAll}
                  />
                </th>
                <th scope="col">Tên cấp bậc</th>
                <th scope="col">Mô tả</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {visibleLevels.map((level) => (
                <tr className={level.status === "archived" ? "is-archived" : undefined} key={level.id}>
                  <td>
                    <FormCheckbox
                      checked={selectedIds.has(level.id)}
                      label={<span className="sr-only">Chọn {level.name}</span>}
                      onChange={() => toggleLevel(level.id)}
                    />
                  </td>
                  <td>{level.name}</td>
                  <td>{level.description || "--"}</td>
                  <td>
                    <span className={level.status === "active" ? "personnel-title-status is-active" : "personnel-title-status is-archived"}>
                      {level.status === "active" ? "Hoạt động" : "Không hoạt động"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isDialogOpen ? <JobLevelDialog onClose={() => setIsDialogOpen(false)} /> : null}
    </section>
  );
}

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

function formatCatalogTimestamp(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date).replace(",", "");
}

export function PositionTitleSettingsBoard({
  data,
  initialKind = "position",
  permissionGroups = [],
  query = ""
}: {
  data: PositionTitleData;
  initialKind?: CatalogView;
  permissionGroups?: PermissionGroup[];
  query?: string;
}) {
  const router = useRouter();
  const isTitleCatalog = initialKind === "title";
  const items: CatalogItem[] = initialKind === "position" ? data.positions : data.titles;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; item?: CatalogItem } | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = normalizeSearch(query);
  const visibleItems = useMemo(() => {
    if (!normalizedQuery) return items;

    return items.filter((item) => {
      const extra = initialKind === "position" ? (item as JobPositionRecord).family : String((item as JobTitleRecord).rank);
      return [item.code, item.name, item.description ?? "", extra ?? ""]
        .some((value) => normalizeSearch(String(value)).includes(normalizedQuery));
    });
  }, [initialKind, items, normalizedQuery]);
  const visibleIds = visibleItems.map((item) => item.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const toggleAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleItem = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelectedItems = () => {
    if (selectedIds.size === 0) return;
    const catalogLabel = initialKind === "position" ? "vị trí công việc" : "chức vụ";
    if (!window.confirm(`Xóa ${selectedIds.size} ${catalogLabel} đã chọn? Thao tác này không thể hoàn tác.`)) return;

    setDeleteMessage(null);
    startDeleteTransition(async () => {
      const result = await deleteCatalogItemsAction(initialKind === "position" ? "position" : "title", [...selectedIds]);
      if (!result.ok) {
        setDeleteMessage(result.error ?? `Không xóa được ${catalogLabel}.`);
        return;
      }

      setSelectedIds(new Set());
      router.refresh();
    });
  };

  const exportItems = () => {
    exportCsv({
      filename: datedCsvFilename(initialKind === "position" ? "vi-tri-cong-viec" : "chuc-vu"),
      rows: visibleItems,
      columns: [
        { header: "Mã", value: (item) => item.code },
        { header: initialKind === "position" ? "Tên vị trí" : "Tên chức vụ", value: (item) => item.name },
        {
          header: initialKind === "position" ? "Chức vụ tương ứng" : "Thứ bậc",
          value: (item) => initialKind === "position" ? (item as JobPositionRecord).family ?? "" : (item as JobTitleRecord).rank
        },
        { header: "Mô tả", value: (item) => item.description ?? "" }
      ]
    });
  };

  const importItems = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);

    try {
      const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim().length > 0);
      const header = splitCsvRow(lines.shift() ?? "").map(normalizeSearch);
      const codeIndex = header.indexOf("mã");
      const nameIndex = header.findIndex((value) => value === "tên vị trí" || value === "tên chức vụ" || value === "tên");
      const metaIndex = header.findIndex((value) => value === "chức vụ tương ứng" || value === "thứ bậc");
      const descriptionIndex = header.indexOf("mô tả");

      if (codeIndex < 0 || nameIndex < 0) throw new Error("CSV cần có cột Mã và Tên vị trí/Tên chức vụ.");

      let successCount = 0;
      for (const line of lines) {
        const values = splitCsvRow(line);
        const formData = new FormData();
        formData.set("code", values[codeIndex] ?? "");
        formData.set("name", values[nameIndex] ?? "");
        formData.set("description", descriptionIndex >= 0 ? values[descriptionIndex] ?? "" : "");
        if (initialKind === "position") formData.set("family", metaIndex >= 0 ? values[metaIndex] ?? "" : "");
        else formData.set("rank", metaIndex >= 0 ? values[metaIndex] ?? "0" : "0");

        const result = initialKind === "position"
          ? await createPositionAction(initialState, formData)
          : await createTitleAction(initialState, formData);
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

  if (initialKind === "level") {
    return <JobLevelCatalog data={data} query={query} />;
  }

  return (
    <section
      className={isTitleCatalog ? "personnel-catalog-panel personnel-title-catalog-panel" : "personnel-catalog-panel"}
      aria-labelledby="personnel-catalog-title"
    >
      <header className={isTitleCatalog ? "personnel-catalog-header personnel-title-catalog-header" : "personnel-catalog-header"}>
        {selectedIds.size > 0 ? (
          <div className="personnel-catalog-selection-heading">
            <h2 className="sr-only" id="personnel-catalog-title">{isTitleCatalog ? "Chức vụ" : "Vị trí công việc"}</h2>
            <button
              className="personnel-catalog-selection-action"
              disabled={isDeleting}
              type="button"
              aria-label={`Xóa ${selectedIds.size} ${isTitleCatalog ? "chức vụ" : "vị trí công việc"} đã chọn`}
              onClick={deleteSelectedItems}
            >
              <Trash size={16} weight="duotone" aria-hidden="true" />
              {isDeleting ? "Đang xóa" : "Xóa"}
            </button>
          </div>
        ) : isTitleCatalog ? (
          <div className="personnel-title-tabs" role="tablist" aria-label="Danh mục chức vụ">
            <a
              aria-selected="true"
              className="is-active"
              href="/admin/settings/job-titles"
              id="personnel-catalog-title"
              role="tab"
            >
              Chức vụ
            </a>
            <a aria-selected="false" href="/admin/settings/job-levels" role="tab">Cấp bậc</a>
          </div>
        ) : (
          <h2 id="personnel-catalog-title">Vị trí công việc</h2>
        )}
        <div className="personnel-catalog-actions">
          <button type="button" onClick={() => setDialog({ mode: "create" })}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Tạo mới
          </button>
          <button type="button" onClick={exportItems}>
            <Export size={16} weight="duotone" aria-hidden="true" />
            Export
          </button>
          {!isTitleCatalog ? (
            <>
              <button type="button" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
                <UploadSimple size={16} weight="duotone" aria-hidden="true" />
                {isImporting ? "Đang import" : "Import"}
              </button>
              <input ref={fileInputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={importItems} />
            </>
          ) : null}
        </div>
      </header>

      {deleteMessage ? <p className="personnel-catalog-message is-error" role="alert">{deleteMessage}</p> : null}
      {importMessage ? <p className="personnel-catalog-message" role="status">{importMessage}</p> : null}
      {data.source === "unavailable" ? (
        <StateBlock tone="error" title="Chưa kết nối được API danh mục">
          {data.error ?? "Hãy bật API server rồi tải lại trang."}
        </StateBlock>
      ) : null}

      <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Bảng danh mục có thể cuộn ngang">
        <table className={isTitleCatalog ? "personnel-catalog-table personnel-title-catalog-table" : "personnel-catalog-table"}>
          <thead>
            {isTitleCatalog ? (
              <tr>
                <th scope="col">
                  <FormCheckbox
                    checked={allVisibleSelected}
                    label={<span className="sr-only">Chọn tất cả chức vụ</span>}
                    onChange={toggleAll}
                    aria-checked={someVisibleSelected ? "mixed" : allVisibleSelected}
                  />
                </th>
                <th scope="col">Người tạo</th>
                <th scope="col">Mã chức vụ</th>
                <th scope="col">Tên chức vụ</th>
                <th scope="col">Trạng thái</th>
              </tr>
            ) : (
              <tr>
                <th scope="col">
                  <FormCheckbox
                    checked={allVisibleSelected}
                    label={<span className="sr-only">Chọn tất cả bản ghi</span>}
                    onChange={toggleAll}
                    aria-checked={someVisibleSelected ? "mixed" : allVisibleSelected}
                  />
                </th>
                <th scope="col">Người tạo</th>
                <th scope="col">Mã</th>
                <th scope="col">Tên vị trí</th>
                <th scope="col">Chức vụ tương ứng</th>
                <th scope="col">Nhóm quyền</th>
                <th scope="col">Mức lương</th>
                <th scope="col">Mô tả</th>
                <th scope="col"><span className="sr-only">Tác vụ</span></th>
              </tr>
            )}
          </thead>
          <tbody>
            {isTitleCatalog && visibleItems.length > 0 ? (
              <tr className="personnel-title-group-row">
                <th colSpan={5} scope="rowgroup">
                  <CaretRight size={18} weight="duotone" aria-hidden="true" />
                  Khác
                </th>
              </tr>
            ) : null}
            {visibleItems.map((item) => {
              const isPosition = initialKind === "position";
              const canArchive = item.employeeCount === 0;

              if (isTitleCatalog) {
                const titleItem = item as JobTitleRecord;
                const createdAt = formatCatalogTimestamp(titleItem.createdAt);

                return (
                  <tr className={item.status === "archived" ? "is-archived" : undefined} key={item.id}>
                    <td>
                      <FormCheckbox
                        checked={selectedIds.has(item.id)}
                        label={<span className="sr-only">Chọn {item.name}</span>}
                        onChange={() => toggleItem(item.id)}
                      />
                    </td>
                    <td><span className="personnel-catalog-avatar" aria-label="Admin">A</span></td>
                    <td>{item.code || "--"}</td>
                    <td>
                      <button className="personnel-catalog-name" type="button" onClick={() => setDialog({ mode: "edit", item })}>
                        {item.name}
                      </button>
                      {createdAt ? <small>{createdAt}</small> : null}
                    </td>
                    <td>
                      <div className="personnel-title-status-cell">
                        <span className={item.status === "active" ? "personnel-title-status is-active" : "personnel-title-status is-archived"}>
                          {item.status === "active" ? "Hoạt động" : "Không hoạt động"}
                        </span>
                        <div className="personnel-title-row-actions">
                          <button type="button" aria-label={`Sửa ${item.name}`} onClick={() => setDialog({ mode: "edit", item })}>
                            <PencilSimple size={16} weight="duotone" aria-hidden="true" />
                          </button>
                          {item.status === "active" ? (
                            <form action={archiveTitleAction}>
                              <input name="id" type="hidden" value={item.id} />
                              <button type="submit" disabled={!canArchive} aria-label={`Lưu trữ ${item.name}`}>
                                <Archive size={16} weight="duotone" aria-hidden="true" />
                              </button>
                            </form>
                          ) : (
                            <form action={restoreTitleAction}>
                              <input name="id" type="hidden" value={item.id} />
                              <button type="submit" aria-label={`Khôi phục ${item.name}`}>
                                <ArchiveRestore size={16} weight="duotone" aria-hidden="true" />
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr className={item.status === "archived" ? "is-archived" : undefined} key={item.id}>
                  <td>
                    <FormCheckbox
                      checked={selectedIds.has(item.id)}
                      label={<span className="sr-only">Chọn {item.name}</span>}
                      onChange={() => toggleItem(item.id)}
                    />
                  </td>
                  <td><span className="personnel-catalog-avatar" aria-label="Admin">A</span></td>
                  <td>{item.code || "--"}</td>
                  <td>
                    <button className="personnel-catalog-name" type="button" onClick={() => setDialog({ mode: "edit", item })}>
                      {item.name}
                    </button>
                    {item.status === "archived" ? <small>Đã lưu trữ</small> : null}
                  </td>
                  <td>{isPosition ? (item as JobPositionRecord).family ?? "--" : (item as JobTitleRecord).rank}</td>
                  <td>--</td>
                  <td className="is-number">0</td>
                  <td>{item.description || "--"}</td>
                  <td>
                    <div className="personnel-catalog-row-actions">
                      <button type="button" aria-label={`Sửa ${item.name}`} onClick={() => setDialog({ mode: "edit", item })}>
                        <PencilSimple size={16} weight="duotone" aria-hidden="true" />
                      </button>
                      {item.status === "active" ? (
                        <form action={isPosition ? archivePositionAction : archiveTitleAction}>
                          <input name="id" type="hidden" value={item.id} />
                          <button type="submit" disabled={!canArchive} aria-label={`Lưu trữ ${item.name}`}>
                            <Archive size={16} weight="duotone" aria-hidden="true" />
                          </button>
                        </form>
                      ) : (
                        <form action={isPosition ? restorePositionAction : restoreTitleAction}>
                          <input name="id" type="hidden" value={item.id} />
                          <button type="submit" aria-label={`Khôi phục ${item.name}`}>
                            <ArchiveRestore size={16} weight="duotone" aria-hidden="true" />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleItems.length === 0 && data.source === "api" ? (
          <div className="personnel-catalog-empty">Không có bản ghi phù hợp.</div>
        ) : null}
      </div>

      {dialog ? (
        <CatalogDialog
          item={dialog.item}
          kind={initialKind}
          levels={data.levels}
          mode={dialog.mode}
          onClose={() => setDialog(null)}
          permissionGroups={permissionGroups}
          positions={data.positions}
          titles={data.titles}
        />
      ) : null}
    </section>
  );
}
