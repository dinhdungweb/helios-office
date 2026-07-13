"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Button, FormField, FormInput, FormTextarea, ModalDialog, StateBlock } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/badge";
import {
  archivePositionAction,
  archiveTitleAction,
  createPositionAction,
  createTitleAction,
  restorePositionAction,
  restoreTitleAction,
  updatePositionAction,
  updateTitleAction,
  type CatalogFormState
} from "@/lib/position-title-actions";
import type { JobPositionRecord, JobTitleRecord, PositionTitleData } from "@/lib/position-title-api";
import { Archive, ArchiveRestore, Briefcase, CheckCircle, Medal, PencilSimple, Plus, Users, X } from "@/lib/icons";

type CatalogKind = "position" | "title";
type CatalogItem = JobPositionRecord | JobTitleRecord;

const initialState: CatalogFormState = { ok: false };

function StatusBadge({ status }: { status: CatalogItem["status"] }) {
  return (
    <Badge
      className={status === "active" ? "org-status org-status--active" : "org-status org-status--paused"}
      tone={status === "active" ? "success" : "neutral"}
    >
      {status === "active" ? "Đang dùng" : "Đã lưu trữ"}
    </Badge>
  );
}

function getItemMeta(kind: CatalogKind, item: CatalogItem) {
  if (kind === "position") {
    const position = item as JobPositionRecord;
    return position.family ?? "Chưa phân nhóm";
  }

  return `Cấp ${String((item as JobTitleRecord).rank).padStart(2, "0")}`;
}

function PositionTitleSummary({ positions, titles }: { positions: JobPositionRecord[]; titles: JobTitleRecord[] }) {
  const activePositions = positions.filter((item) => item.status === "active");
  const activeTitles = titles.filter((item) => item.status === "active");
  const usedItems = [...positions, ...titles].reduce((total, item) => total + item.employeeCount, 0);
  const summaryItems = [
    { label: "Vị trí", value: activePositions.length, icon: Briefcase },
    { label: "Chức danh", value: activeTitles.length, icon: Medal },
    { label: "Đang gán", value: usedItems, icon: Users },
    { label: "Lưu trữ", value: positions.length + titles.length - activePositions.length - activeTitles.length, icon: Archive }
  ];

  return (
    <section className="org-summary-grid" aria-label="Tổng quan vị trí và chức danh">
      {summaryItems.map((item) => (
        <article className="org-summary-card" key={item.label}>
          <span>
            <item.icon size={19} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <strong>{item.value}</strong>
            <p>{item.label}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function CatalogDialog({
  item,
  kind,
  mode,
  onClose
}: {
  item?: CatalogItem;
  kind: CatalogKind;
  mode: "create" | "edit";
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const action =
    kind === "position"
      ? mode === "create"
        ? createPositionAction
        : updatePositionAction
      : mode === "create"
        ? createTitleAction
        : updateTitleAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const title = `${mode === "create" ? "Tạo" : "Sửa"} ${kind === "position" ? "vị trí" : "chức danh"}`;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.ok) {
      onClose();
    }
  }, [onClose, state.ok]);

  return (
    <ModalDialog className="position-catalog-dialog" ref={dialogRef} title={title} onCloseRequest={onClose}>
      <form className="account-dialog-form" action={formAction}>
        {item ? <input name="id" type="hidden" value={item.id} /> : null}
        <div className="account-dialog-grid">
          <FormField label="Mã" >
            <FormInput name="code" required minLength={2} defaultValue={item?.code ?? ""} placeholder={kind === "position" ? "POS-HR" : "TTL-MGR"} />
          </FormField>
          <FormField label={kind === "position" ? "Tên vị trí" : "Tên chức danh"}>
            <FormInput name="name" required minLength={2} defaultValue={item?.name ?? ""} />
          </FormField>
          {kind === "position" ? (
            <FormField label="Nhóm chuyên môn" wide>
              <FormInput name="family" defaultValue={(item as JobPositionRecord | undefined)?.family ?? ""} placeholder="People Operations" />
            </FormField>
          ) : (
            <FormField label="Thứ bậc" wide>
              <FormInput name="rank" type="number" min={0} defaultValue={(item as JobTitleRecord | undefined)?.rank ?? 0} />
            </FormField>
          )}
          <FormField label="Mô tả" wide>
            <FormTextarea name="description" rows={4} defaultValue={item?.description ?? ""} />
          </FormField>
        </div>
        {state.error ? <p className="account-dialog-error">{state.error}</p> : null}
        <div className="account-dialog-actions">
          <Button icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={onClose} variant="secondary">
            Hủy
          </Button>
          <Button icon={<CheckCircle size={16} weight="duotone" aria-hidden="true" />} isLoading={isPending} type="submit" variant="primary">
            Lưu
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}

function CatalogTable({
  icon: Icon,
  items,
  kind,
  onCreate,
  onEdit,
  onSelect,
  selectedId,
  summary,
  title
}: {
  icon: typeof Briefcase;
  items: CatalogItem[];
  kind: CatalogKind;
  onCreate: () => void;
  onEdit: (item: CatalogItem) => void;
  onSelect: (item: CatalogItem) => void;
  selectedId?: string;
  summary: string;
  title: string;
}) {
  return (
    <section className="org-panel" aria-labelledby={`${kind}-catalog-title`}>
      <header className="org-panel-header">
        <div>
          <h2 id={`${kind}-catalog-title`}>{title}</h2>
          <p>{summary}</p>
        </div>
        <div className="org-panel-actions">
          <Button icon={<Plus size={16} weight="duotone" aria-hidden="true" />} onClick={onCreate} variant="primary">
            Thêm mới
          </Button>
        </div>
      </header>

      <div className="position-catalog-table-shell" tabIndex={0} aria-label={`${title} có thể cuộn ngang`}>
        <table className="position-catalog-table">
          <thead>
            <tr>
              <th scope="col">Danh mục</th>
              <th scope="col">{kind === "position" ? "Nhóm chuyên môn" : "Thứ bậc"}</th>
              <th scope="col">Nhân sự</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Tác vụ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const canArchive = item.employeeCount === 0;
              return (
                <tr className={selectedId === item.id ? "is-selected" : undefined} key={item.id} onClick={() => onSelect(item)}>
                  <th scope="row">
                    <div className="position-catalog-name">
                      <span>
                        <Icon size={17} weight="duotone" aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{item.name}</strong>
                        <small>{item.code}</small>
                      </div>
                    </div>
                  </th>
                  <td>{getItemMeta(kind, item)}</td>
                  <td>{item.employeeCount} người</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>
                    <div className="account-row-actions">
                      <button className="icon-button" type="button" aria-label="Sửa danh mục" onClick={(event) => {
                        event.stopPropagation();
                        onEdit(item);
                      }}>
                        <PencilSimple size={16} weight="duotone" aria-hidden="true" />
                      </button>
                      {item.status === "active" ? (
                        <form action={kind === "position" ? archivePositionAction : archiveTitleAction} onClick={(event) => event.stopPropagation()}>
                          <input name="id" type="hidden" value={item.id} />
                          <button
                            className="icon-button"
                            type="submit"
                            aria-label="Lưu trữ danh mục"
                            disabled={!canArchive}
                            title={canArchive ? "Lưu trữ" : "Cần chuyển hết nhân sự trước"}
                          >
                            <Archive size={16} weight="duotone" aria-hidden="true" />
                          </button>
                        </form>
                      ) : (
                        <form action={kind === "position" ? restorePositionAction : restoreTitleAction} onClick={(event) => event.stopPropagation()}>
                          <input name="id" type="hidden" value={item.id} />
                          <button className="icon-button" type="submit" aria-label="Khôi phục danh mục">
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
      </div>
    </section>
  );
}

function SelectedDetailPanel({ item, kind }: { item?: CatalogItem; kind: CatalogKind }) {
  if (!item) {
    return (
      <section className="org-panel" aria-labelledby="position-detail-title">
        <header className="org-panel-header">
          <div>
            <h2 id="position-detail-title">Chi tiết</h2>
            <p>Chưa chọn danh mục</p>
          </div>
        </header>
        <StateBlock title="Chưa có dữ liệu">Tạo vị trí hoặc chức danh đầu tiên để dùng trong hồ sơ nhân sự.</StateBlock>
      </section>
    );
  }

  return (
    <section className="org-panel" aria-labelledby="position-detail-title">
      <header className="org-panel-header">
        <div>
          <h2 id="position-detail-title">{item.name}</h2>
          <p>{kind === "position" ? "Vị trí chuyên môn" : "Chức danh/cấp bậc"}</p>
        </div>
        <StatusBadge status={item.status} />
      </header>

      <dl className="org-detail-list position-detail-list">
        <div>
          <dt>Mã</dt>
          <dd>{item.code}</dd>
        </div>
        <div>
          <dt>{kind === "position" ? "Nhóm chuyên môn" : "Thứ bậc"}</dt>
          <dd>{getItemMeta(kind, item)}</dd>
        </div>
        <div>
          <dt>Nhân sự đang gán</dt>
          <dd>{item.employeeCount} người</dd>
        </div>
      </dl>

      <div className="position-detail-section">
        <h3>Mô tả</h3>
        <p>{item.description || "Chưa có mô tả."}</p>
      </div>
    </section>
  );
}

export function PositionTitleSettingsBoard({ data }: { data: PositionTitleData }) {
  const firstItem = data.positions[0] ?? data.titles[0];
  const [selected, setSelected] = useState<{ kind: CatalogKind; id: string } | null>(
    firstItem ? { kind: data.positions[0] ? "position" : "title", id: firstItem.id } : null
  );
  const [dialog, setDialog] = useState<{ kind: CatalogKind; mode: "create" | "edit"; item?: CatalogItem } | null>(null);
  const selectedItem = useMemo(() => {
    if (!selected) {
      return undefined;
    }

    return selected.kind === "position"
      ? data.positions.find((item) => item.id === selected.id)
      : data.titles.find((item) => item.id === selected.id);
  }, [data.positions, data.titles, selected]);

  return (
    <main className="org-chart-settings-page position-title-settings-page" aria-label="Cài đặt vị trí và chức danh">
      <section className="org-page-heading" aria-labelledby="position-title-page-title">
        <div>
          <span>HR MASTER DATA</span>
          <h1 id="position-title-page-title">Vị trí & chức danh</h1>
          <p>Vị trí mô tả chuyên môn công việc; chức danh mô tả cấp bậc trong tổ chức.</p>
        </div>
        <a className="secondary-button" href="/admin/settings">
          Quay lại cài đặt
        </a>
      </section>

      {data.source === "unavailable" ? (
        <StateBlock tone="error" title="Chưa kết nối được API danh mục">
          {data.error ?? "Hãy bật API server rồi tải lại trang."}
        </StateBlock>
      ) : null}

      <PositionTitleSummary positions={data.positions} titles={data.titles} />

      <section className="org-settings-layout position-settings-layout" aria-label="Thiết lập vị trí và chức danh">
        <div className="org-settings-main">
          <CatalogTable
            icon={Briefcase}
            items={data.positions}
            kind="position"
            onCreate={() => setDialog({ kind: "position", mode: "create" })}
            onEdit={(item) => setDialog({ kind: "position", mode: "edit", item })}
            onSelect={(item) => setSelected({ kind: "position", id: item.id })}
            selectedId={selected?.kind === "position" ? selected.id : undefined}
            summary="Danh mục chuyên môn/nghề nghiệp gắn vào hồ sơ nhân sự."
            title="Vị trí chuyên môn"
          />
          <CatalogTable
            icon={Medal}
            items={data.titles}
            kind="title"
            onCreate={() => setDialog({ kind: "title", mode: "create" })}
            onEdit={(item) => setDialog({ kind: "title", mode: "edit", item })}
            onSelect={(item) => setSelected({ kind: "title", id: item.id })}
            selectedId={selected?.kind === "title" ? selected.id : undefined}
            summary="Danh mục cấp bậc/chức danh, không thay thế quyền hệ thống."
            title="Chức danh/cấp bậc"
          />
        </div>
        <aside className="org-settings-side" aria-label="Chi tiết danh mục">
          <SelectedDetailPanel item={selectedItem} kind={selected?.kind ?? "position"} />
        </aside>
      </section>

      {dialog ? (
        <CatalogDialog item={dialog.item} kind={dialog.kind} mode={dialog.mode} onClose={() => setDialog(null)} />
      ) : null}
    </main>
  );
}
