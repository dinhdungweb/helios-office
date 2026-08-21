"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { PermissionGroupBulkConfirmDialog } from "@/components/admin/permission-group-bulk-confirm-dialog";
import { ResponsiveToolbarActionMenu } from "@/components/admin/responsive-toolbar-action-menu";
import { FormCheckbox } from "@/components/ui/form-controls";
import {
  CaretRight,
  DotsThree,
  Export,
  GearSix,
  List,
  MagnifyingGlass,
  SlidersHorizontal,
  TextAlignLeft,
  X
} from "@/lib/icons";
import type { AccountAccessData, ManagedUserAccount, PermissionGroup } from "@/lib/account-access-api";
import { datedCsvFilename, exportCsv } from "@/lib/csv-export";
import { hasGroupSystemPermissions } from "@/lib/user-group-permission-model";

type GroupListRow = {
  activeAccounts: number;
  createdAt: string;
  creatorAvatar: string;
  defaultGroup: boolean;
  group: PermissionGroup;
  lockedAccounts: number;
  updatedAt: string;
  updaterAvatar: string;
};

type GroupFilterPanel = "sort" | "columns" | null;
type GroupSortDirection = "asc" | "desc";
type GroupColumnKey =
  | "name"
  | "systemAdmin"
  | "defaultGroup"
  | "activeAccounts"
  | "lockedAccounts"
  | "creator"
  | "updater"
  | "createdAt"
  | "updatedAt";

type GroupColumn = {
  defaultVisible: boolean;
  key: GroupColumnKey;
  label: string;
};

const groupColumns: GroupColumn[] = [
  { key: "name", label: "Tên nhóm", defaultVisible: true },
  { key: "systemAdmin", label: "Quản trị hệ thống", defaultVisible: true },
  { key: "defaultGroup", label: "Nhóm mặc định", defaultVisible: true },
  { key: "activeAccounts", label: "Tài khoản hoạt động", defaultVisible: true },
  { key: "lockedAccounts", label: "Tài khoản bị khóa", defaultVisible: true },
  { key: "creator", label: "Người tạo", defaultVisible: true },
  { key: "updater", label: "Người sửa", defaultVisible: true },
  { key: "createdAt", label: "Ngày tạo", defaultVisible: true },
  { key: "updatedAt", label: "Ngày sửa", defaultVisible: true }
];

const groupSortColumns = groupColumns.filter((column) => !["creator", "updater"].includes(column.key));
const defaultVisibleGroupColumnKeys = groupColumns
  .filter((column) => column.defaultVisible)
  .map((column) => column.key);

const auditDates = [
  { createdAt: "23/02/2024", updatedAt: "16/04/2026" },
  { createdAt: "24/02/2024", updatedAt: "16/04/2026" },
  { createdAt: "24/02/2024", updatedAt: "16/04/2026" },
  { createdAt: "24/02/2024", updatedAt: "26/05/2026" },
  { createdAt: "24/02/2024", updatedAt: "16/04/2026" },
  { createdAt: "24/02/2024", updatedAt: "16/04/2026" },
  { createdAt: "04/04/2024", updatedAt: "20/10/2025" },
  { createdAt: "04/04/2024", updatedAt: "16/04/2026" }
];

const hiddenPermissionGroupIds = new Set(["grp-system-admin"]);

function ApiStatusBanner({ data }: { data: AccountAccessData }) {
  if (data.source === "api") {
    return null;
  }

  return (
    <section className="account-api-banner admin-user-api-banner" role="status">
      <strong>Chưa kết nối được Account API</strong>
      <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
    </section>
  );
}

function isAccountInGroup(account: ManagedUserAccount, group: PermissionGroup) {
  return account.groupId === group.id;
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "A";
}

function adminAvatar(accounts: ManagedUserAccount[]) {
  const admin = accounts.find((account) => account.role === "system_admin") ?? accounts[0];

  return admin ? initialsFromName(admin.name) : "A";
}

function buildRows(data: AccountAccessData) {
  const auditAvatar = adminAvatar(data.accounts);

  return data.groups.filter((group) => !hiddenPermissionGroupIds.has(group.id)).map((group, index) => {
    const groupAccounts = data.accounts.filter((account) => isAccountInGroup(account, group));
    const activeAccounts = groupAccounts.filter((account) => account.status === "active").length || group.memberCount;
    const lockedAccounts = groupAccounts.filter((account) => account.status === "closed").length;
    const audit = auditDates[index % auditDates.length];

    return {
      activeAccounts,
      createdAt: audit.createdAt,
      creatorAvatar: auditAvatar,
      defaultGroup: false,
      group,
      lockedAccounts,
      updatedAt: audit.updatedAt,
      updaterAvatar: auditAvatar
    } satisfies GroupListRow;
  });
}

function GroupAuditAvatar({ label }: { label: string }) {
  return (
    <span className="admin-group-audit-avatar" aria-label={label} title={label}>
      {label}
    </span>
  );
}

function groupDetailHref(groupId: string) {
  return `/admin/settings/accounts/groups/${encodeURIComponent(groupId)}`;
}

function groupColumnValue(columnKey: GroupColumnKey, row: GroupListRow) {
  switch (columnKey) {
    case "name":
      return row.group.name;
    case "systemAdmin":
      return hasGroupSystemPermissions(row.group.permissionKeys) ? "Có" : "Không";
    case "defaultGroup":
      return row.defaultGroup ? "Có" : "Không";
    case "activeAccounts":
      return row.activeAccounts;
    case "lockedAccounts":
      return row.lockedAccounts;
    case "creator":
      return row.creatorAvatar;
    case "updater":
      return row.updaterAvatar;
    case "createdAt":
      return row.createdAt;
    case "updatedAt":
      return row.updatedAt;
  }
}

function groupSortValue(columnKey: GroupColumnKey, row: GroupListRow) {
  const value = groupColumnValue(columnKey, row);

  if (columnKey === "createdAt" || columnKey === "updatedAt") {
    const [day, month, year] = String(value).split("/");
    return `${year ?? ""}${month ?? ""}${day ?? ""}`;
  }

  return String(value);
}

function GroupColumnToggle({
  column,
  isVisible,
  onToggle,
  showHandle
}: {
  column: GroupColumn;
  isVisible: boolean;
  onToggle: () => void;
  showHandle?: boolean;
}) {
  return (
    <label className="admin-user-column-toggle">
      <span className="admin-user-column-handle" aria-hidden="true">
        {showHandle ? <DotsThree size={15} weight="duotone" /> : null}
      </span>
      <span>{column.label}</span>
      <input type="checkbox" checked={isVisible} onChange={onToggle} />
      <span className="admin-user-column-switch" aria-hidden="true" />
    </label>
  );
}

export function UserGroupListBoard({ data }: { data: AccountAccessData }) {
  const router = useRouter();
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterPanel, setActiveFilterPanel] = useState<GroupFilterPanel>(null);
  const [columnQuery, setColumnQuery] = useState("");
  const [sortColumnKey, setSortColumnKey] = useState<GroupColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<GroupSortDirection>("asc");
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<GroupColumnKey>>(
    () => new Set(defaultVisibleGroupColumnKeys)
  );
  const [bulkMessage, setBulkMessage] = useState("");
  const filterRef = useRef<HTMLDivElement | null>(null);
  const rows = useMemo(() => buildRows(data), [data]);
  const sortedRows = useMemo(() => {
    if (!sortColumnKey) {
      return rows;
    }

    return [...rows].sort((left, right) => {
      const result = groupSortValue(sortColumnKey, left).localeCompare(
        groupSortValue(sortColumnKey, right),
        "vi",
        { numeric: true, sensitivity: "base" }
      );

      return sortDirection === "asc" ? result : -result;
    });
  }, [rows, sortColumnKey, sortDirection]);
  const visibleRows = sortedRows.slice(0, 50);
  const visibleColumns = groupColumns.filter((column) => visibleColumnKeys.has(column.key));
  const visibleRowIds = visibleRows.map((row) => row.group.id);
  const selectedVisibleCount = visibleRowIds.filter((id) => selectedGroupIds.has(id)).length;
  const areAllVisibleRowsSelected = visibleRowIds.length > 0 && selectedVisibleCount === visibleRowIds.length;
  const isSomeVisibleRowSelected = selectedVisibleCount > 0 && !areAllVisibleRowsSelected;
  const selectedRowCount = selectedGroupIds.size;
  const hasSelectedRows = selectedRowCount > 0;
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedGroupIds.has(row.group.id)),
    [rows, selectedGroupIds]
  );
  const selectedGroupIdList = useMemo(
    () => selectedRows.map((row) => row.group.id),
    [selectedRows]
  );

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const closeFilter = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false);
        setActiveFilterPanel(null);
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
        setActiveFilterPanel(null);
      }
    };

    document.addEventListener("pointerdown", closeFilter);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeFilter);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFilterOpen]);

  useEffect(() => {
    if (!bulkMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setBulkMessage(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [bulkMessage]);

  const chooseSortColumn = (columnKey: GroupColumnKey) => {
    if (sortColumnKey === columnKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumnKey(columnKey);
    setSortDirection("asc");
  };

  const clearSort = () => {
    setSortColumnKey(null);
    setSortDirection("asc");
    setVisibleColumnKeys(new Set(defaultVisibleGroupColumnKeys));
    setColumnQuery("");
    setActiveFilterPanel(null);
    setIsFilterOpen(false);
  };

  const toggleColumn = (columnKey: GroupColumnKey) => {
    setVisibleColumnKeys((current) => {
      const next = new Set(current);

      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }

      return next.size > 0 ? next : current;
    });
  };

  const toggleAllVisibleRows = () => {
    setSelectedGroupIds((current) => {
      const next = new Set(current);

      if (areAllVisibleRowsSelected) {
        visibleRowIds.forEach((id) => next.delete(id));
      } else {
        visibleRowIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const toggleRow = (groupId: string) => {
    setSelectedGroupIds((current) => {
      const next = new Set(current);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  };

  const openGroupDetail = (groupId: string) => {
    router.push(groupDetailHref(groupId) as Route);
  };

  const openGroupDetailFromRow = (event: MouseEvent<HTMLTableRowElement>, groupId: string) => {
    if ((event.target as HTMLElement).closest("a, button, input, label")) {
      return;
    }

    openGroupDetail(groupId);
  };

  const openGroupDetailFromKeyboard = (event: KeyboardEvent<HTMLTableRowElement>, groupId: string) => {
    if (event.key !== "Enter") {
      return;
    }

    openGroupDetail(groupId);
  };

  const completeBulkAction = useCallback((message: string) => {
    setSelectedGroupIds(new Set());
    setBulkMessage(message);
  }, []);

  const exportGroups = (rowsToExport: GroupListRow[]) => {
    if (rowsToExport.length === 0) {
      setBulkMessage("Không có nhóm để export.");
      return;
    }

    exportCsv({
      filename: datedCsvFilename("nhom-nguoi-dung"),
      rows: rowsToExport,
      columns: [
        { header: "Tên nhóm", value: (row) => row.group.name },
        { header: "Trạng thái", value: (row) => row.group.status === "active" ? "Đang hoạt động" : "Đã đóng" },
        { header: "Quản trị hệ thống", value: (row) => hasGroupSystemPermissions(row.group.permissionKeys) ? "Có" : "Không" },
        { header: "Nhóm mặc định", value: (row) => row.defaultGroup ? "Có" : "Không" },
        { header: "Tài khoản hoạt động", value: (row) => row.activeAccounts },
        { header: "Tài khoản bị khóa", value: (row) => row.lockedAccounts },
        { header: "Số quyền", value: (row) => row.group.permissionKeys.length }
      ]
    });
    setBulkMessage(`Đã export ${rowsToExport.length} nhóm.`);
  };

  return (
    <main className="admin-user-list-page admin-group-list-page" aria-label="Danh sách nhóm">
      {bulkMessage ? (
        <div className="account-group-change-success" role="status">
          <span>{bulkMessage}</span>
        </div>
      ) : null}
      <ApiStatusBanner data={data} />

      {hasSelectedRows ? (
        <section className="department-directory-bulk-actions personnel-contract-bulk-actions" aria-label="Thao tác với nhóm đã chọn">
          <button type="button" onClick={() => exportGroups(selectedRows)}>
            <Export size={16} weight="duotone" aria-hidden="true" />
            <span>Export</span>
          </button>
          <PermissionGroupBulkConfirmDialog
            groupIds={selectedGroupIdList}
            mode="archive"
            onSuccess={completeBulkAction}
          />
          <PermissionGroupBulkConfirmDialog
            groupIds={selectedGroupIdList}
            mode="delete"
            onSuccess={completeBulkAction}
          />
        </section>
      ) : (
        <section className="admin-group-list-strip" aria-label="Chế độ danh sách nhóm">
          <button type="button" aria-label="Chế độ danh sách nhóm">
            <List size={18} weight="duotone" aria-hidden="true" />
          </button>
        </section>
      )}

      <section className="admin-user-toolbar admin-group-toolbar has-responsive-actions" aria-label="Công cụ danh sách nhóm">
        <div className="admin-user-toolbar-left">
          <div className="admin-user-filter-wrap" ref={filterRef}>
            <button
              className={isFilterOpen ? "admin-user-filter-trigger is-active" : "admin-user-filter-trigger"}
              type="button"
              aria-label="Bộ lọc danh sách nhóm"
              aria-expanded={isFilterOpen}
              onClick={() => {
                setIsFilterOpen((current) => !current);
                setActiveFilterPanel(null);
              }}
            >
              <SlidersHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {isFilterOpen ? (
              <div
                className={
                  activeFilterPanel === "columns"
                    ? "admin-user-filter-popover has-column-panel"
                    : activeFilterPanel
                      ? "admin-user-filter-popover has-submenu"
                      : "admin-user-filter-popover"
                }
                role="menu"
                aria-label="Bộ lọc danh sách nhóm"
                onMouseLeave={() => setActiveFilterPanel(null)}
              >
                <div className="admin-user-filter-menu">
                  <button
                    className={activeFilterPanel === "sort" ? "is-active" : undefined}
                    type="button"
                    role="menuitem"
                    aria-expanded={activeFilterPanel === "sort"}
                    onMouseEnter={() => setActiveFilterPanel("sort")}
                    onFocus={() => setActiveFilterPanel("sort")}
                    onClick={() => setActiveFilterPanel("sort")}
                  >
                    <TextAlignLeft size={17} weight="duotone" aria-hidden="true" />
                    <span>Sắp xếp danh sách</span>
                    <CaretRight size={15} weight="duotone" aria-hidden="true" />
                  </button>
                  <button
                    className={activeFilterPanel === "columns" ? "is-active" : undefined}
                    type="button"
                    role="menuitem"
                    aria-expanded={activeFilterPanel === "columns"}
                    onMouseEnter={() => setActiveFilterPanel("columns")}
                    onFocus={() => setActiveFilterPanel("columns")}
                    onClick={() => setActiveFilterPanel("columns")}
                  >
                    <List size={17} weight="duotone" aria-hidden="true" />
                    <span>Chọn cột hiển thị</span>
                    <CaretRight size={15} weight="duotone" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onMouseEnter={() => setActiveFilterPanel(null)}
                    onFocus={() => setActiveFilterPanel(null)}
                    onClick={clearSort}
                  >
                    <X size={17} weight="duotone" aria-hidden="true" />
                    <span>Bỏ sắp xếp</span>
                  </button>
                </div>

                {activeFilterPanel === "sort" ? (
                  <div className="admin-user-submenu" role="group" aria-label="Chọn cột sắp xếp nhóm">
                    {groupSortColumns.map((column) => (
                      <button
                        className={sortColumnKey === column.key ? "is-selected" : undefined}
                        type="button"
                        key={column.key}
                        onClick={() => chooseSortColumn(column.key)}
                      >
                        <span>{column.label}</span>
                        {sortColumnKey === column.key ? (
                          <CaretRight
                            className={sortDirection === "desc" ? "is-desc" : undefined}
                            size={15}
                            weight="duotone"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {activeFilterPanel === "columns" ? (
                  <section className="admin-user-column-panel" aria-label="Trường hiển thị nhóm">
                    <header>
                      <h3>Trường hiển thị</h3>
                      <button className="icon-button" type="button" aria-label="Đóng trường hiển thị" onClick={() => setActiveFilterPanel(null)}>
                        <X size={18} weight="duotone" aria-hidden="true" />
                      </button>
                    </header>
                    <label className="admin-user-column-search">
                      <span className="sr-only">Tìm kiếm trường</span>
                      <input
                        value={columnQuery}
                        type="search"
                        placeholder="Tìm kiếm trường"
                        onChange={(event) => setColumnQuery(event.target.value)}
                      />
                      <MagnifyingGlass size={18} weight="duotone" aria-hidden="true" />
                    </label>
                    <div className="admin-user-column-list">
                      {groupColumns
                        .filter((column) => column.label.toLowerCase().includes(columnQuery.trim().toLowerCase()))
                        .map((column) => (
                          <GroupColumnToggle
                            column={column}
                            isVisible={visibleColumnKeys.has(column.key)}
                            key={column.key}
                            showHandle={visibleColumnKeys.has(column.key)}
                            onToggle={() => toggleColumn(column.key)}
                          />
                        ))}
                    </div>
                    <footer>
                      <button
                        type="button"
                        onClick={() => {
                          setVisibleColumnKeys(new Set(defaultVisibleGroupColumnKeys));
                          setColumnQuery("");
                        }}
                      >
                        Mặc định
                      </button>
                    </footer>
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
          {hasSelectedRows ? (
            <span>
              Đã chọn <strong>{selectedRowCount}</strong> bản ghi
            </span>
          ) : (
            <span>
              Hiển thị 1 - {visibleRows.length} / {rows.length} bản ghi
            </span>
          )}
        </div>

        {hasSelectedRows ? null : (
          <ResponsiveToolbarActionMenu
            ariaLabel="Mở menu thao tác nhóm"
            actions={[
              {
                key: "export",
                icon: <Export size={16} weight="duotone" aria-hidden="true" />,
                label: "Export",
                onClick: () => exportGroups(rows)
              },
              {
                key: "settings",
                href: "/admin/settings/system",
                icon: <GearSix size={16} weight="duotone" aria-hidden="true" />,
                label: "Cài đặt"
              }
            ]}
          />
        )}
      </section>

      <div className="admin-user-table-shell admin-group-table-shell" tabIndex={0} aria-label="Bảng danh sách nhóm có thể cuộn ngang">
        <table className="admin-user-table admin-group-table">
          <thead>
            <tr>
              <th scope="col">
                <FormCheckbox
                  checked={areAllVisibleRowsSelected}
                  className="admin-user-table-checkbox"
                  disabled={visibleRowIds.length === 0}
                  label={<span className="sr-only">Chọn tất cả nhóm</span>}
                  aria-checked={isSomeVisibleRowSelected ? "mixed" : areAllVisibleRowsSelected}
                  onChange={toggleAllVisibleRows}
                />
              </th>
              {visibleColumns.map((column) => (
                <th
                  scope="col"
                  key={column.key}
                  aria-sort={
                    column.key === sortColumnKey
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {column.label}
                  {column.key === sortColumnKey ? (
                    <span aria-hidden="true">{sortDirection === "asc" ? " ↑" : " ↓"}</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                className="admin-group-clickable-row"
                key={row.group.id}
                tabIndex={0}
                onClick={(event) => openGroupDetailFromRow(event, row.group.id)}
                onKeyDown={(event) => openGroupDetailFromKeyboard(event, row.group.id)}
              >
                <td>
                  <FormCheckbox
                    checked={selectedGroupIds.has(row.group.id)}
                    className="admin-user-table-checkbox"
                    label={<span className="sr-only">Chọn {row.group.name}</span>}
                    onChange={() => toggleRow(row.group.id)}
                  />
                </td>
                {visibleColumns.map((column) => {
                  if (column.key === "name") {
                    return (
                      <th scope="row" key={column.key}>
                        <a className="admin-group-name" href={groupDetailHref(row.group.id)}>
                          {row.group.name}
                        </a>
                      </th>
                    );
                  }

                  if (column.key === "creator" || column.key === "updater") {
                    return (
                      <td key={column.key}>
                        <GroupAuditAvatar label={String(groupColumnValue(column.key, row))} />
                      </td>
                    );
                  }

                  return <td key={column.key}>{groupColumnValue(column.key, row)}</td>;
                })}
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1}>
                  <span className="account-empty-state">Chưa có nhóm người dùng nào trong hệ thống.</span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
