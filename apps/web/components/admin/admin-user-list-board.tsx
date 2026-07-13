"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FormCheckbox } from "@/components/ui/form-controls";
import {
  CaretLeft,
  CaretRight,
  DotsThree,
  Export,
  GearSix,
  List,
  MagnifyingGlass,
  SlidersHorizontal,
  Star,
  TextAlignLeft,
  X
} from "@/lib/icons";
import type {
  AccountAccessData,
  AccountLifecycleStatus,
  AccountRole,
  ManagedUserAccount,
  PermissionGroup
} from "@/lib/account-access-api";

type UserListFilter = AccountLifecycleStatus | "waiting" | "device";
type FilterPanel = "sort" | "columns" | null;
type SortDirection = "asc" | "desc";
type UserColumnKey =
  | "account"
  | "group"
  | "employeeCode"
  | "name"
  | "department"
  | "signature"
  | "createdAt"
  | "activatedAt"
  | "combo"
  | "apps"
  | "personnelId"
  | "customPermission"
  | "adminRole"
  | "status"
  | "extraDepartments"
  | "company"
  | "branch"
  | "title"
  | "position"
  | "email"
  | "updatedAt"
  | "lastLogin"
  | "role";

const statusLabels: Record<AccountLifecycleStatus, string> = {
  active: "Đang hoạt động",
  closed: "Đã khóa",
  pending_activation: "Chưa kích hoạt"
};

const tabOrder: Array<{ key: UserListFilter; label: string }> = [
  { key: "active", label: "Đang hoạt động" },
  { key: "closed", label: "Đã khóa" },
  { key: "pending_activation", label: "Chưa kích hoạt" },
  { key: "waiting", label: "Chờ kích hoạt" },
  { key: "device", label: "Xác thực thiết bị" }
];

const sortColumns: Array<{ key: UserColumnKey; label: string }> = [
  { key: "title", label: "Chức vụ" },
  { key: "lastLogin", label: "Đăng nhập lần cuối" },
  { key: "email", label: "Email" },
  { key: "name", label: "Họ tên" },
  { key: "employeeCode", label: "Mã NS" },
  { key: "updatedAt", label: "Ngày cập nhật" },
  { key: "activatedAt", label: "Ngày kích hoạt" },
  { key: "createdAt", label: "Ngày tạo" },
  { key: "group", label: "Nhóm" },
  { key: "department", label: "Phòng ban" }
];

type UserColumn = {
  key: UserColumnKey;
  label: string;
  defaultVisible: boolean;
};

const userColumns: UserColumn[] = [
  { key: "account", label: "Tài khoản", defaultVisible: true },
  { key: "group", label: "Nhóm", defaultVisible: true },
  { key: "employeeCode", label: "Mã NS", defaultVisible: true },
  { key: "name", label: "Họ tên", defaultVisible: true },
  { key: "department", label: "Phòng ban", defaultVisible: true },
  { key: "signature", label: "Chữ ký số", defaultVisible: true },
  { key: "createdAt", label: "Ngày tạo", defaultVisible: true },
  { key: "activatedAt", label: "Ngày kích hoạt", defaultVisible: true },
  { key: "combo", label: "Combo sử dụng", defaultVisible: true },
  { key: "apps", label: "Apps sử dụng", defaultVisible: true },
  { key: "personnelId", label: "admin.user.field.personnel_id", defaultVisible: false },
  { key: "customPermission", label: "Tùy chỉnh quyền", defaultVisible: false },
  { key: "adminRole", label: "Quản trị hệ thống", defaultVisible: false },
  { key: "status", label: "Trạng thái", defaultVisible: false },
  { key: "extraDepartments", label: "Phòng ban kiêm nhiệm", defaultVisible: false },
  { key: "company", label: "Công ty", defaultVisible: false },
  { key: "branch", label: "Chi nhánh", defaultVisible: false },
  { key: "title", label: "Chức vụ", defaultVisible: false },
  { key: "position", label: "Vị trí", defaultVisible: false },
  { key: "email", label: "Email", defaultVisible: false },
  { key: "updatedAt", label: "Ngày cập nhật", defaultVisible: false },
  { key: "lastLogin", label: "Đăng nhập lần cuối", defaultVisible: false },
  { key: "role", label: "Vai trò người dùng", defaultVisible: false }
];

const defaultVisibleColumnKeys = userColumns.filter((column) => column.defaultVisible).map((column) => column.key);

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

function getAccountName(account: ManagedUserAccount) {
  return account.email.includes("@") ? account.email.split("@")[0] : account.email;
}

function getLicenseLabel(role: AccountRole) {
  return role === "system_admin" ? "Professional" : "Basic Hrm";
}

function isSystemAdminAccount(account: ManagedUserAccount) {
  return account.role === "system_admin";
}

function getDisplayDate(account: ManagedUserAccount) {
  return account.activatedAt ?? account.temporaryPasswordIssuedAt ?? "--";
}

function getTabCount(accounts: ManagedUserAccount[], filter: UserListFilter) {
  if (filter === "waiting" || filter === "device") {
    return 0;
  }

  return accounts.filter((account) => account.status === filter).length;
}

function matchesFilter(account: ManagedUserAccount, filter: UserListFilter) {
  if (filter === "waiting" || filter === "device") {
    return false;
  }

  return account.status === filter;
}

function groupNameFor(account: ManagedUserAccount, groupsById: Map<string, PermissionGroup>) {
  if (isSystemAdminAccount(account)) {
    return "--";
  }

  return account.groupId ? groupsById.get(account.groupId)?.name ?? "--" : "--";
}

function renderColumnValue(columnKey: UserColumnKey, account: ManagedUserAccount, groupsById: Map<string, PermissionGroup>) {
  const isSystemAdmin = isSystemAdminAccount(account);

  switch (columnKey) {
    case "account":
      return (
        <span className={isSystemAdmin ? "admin-user-account-name is-system-admin" : "admin-user-account-name"}>
          {isSystemAdmin ? (
            getAccountName(account)
          ) : (
            <a href={`/admin/settings/accounts/${encodeURIComponent(account.id)}`}>{getAccountName(account)}</a>
          )}
          {!isSystemAdmin && account.customPermissionKeys.length > 0 ? (
            <Star size={13} weight="fill" aria-label="Có quyền tùy chỉnh riêng" />
          ) : null}
        </span>
      );
    case "group":
      return groupNameFor(account, groupsById);
    case "employeeCode":
    case "personnelId":
      if (isSystemAdmin) {
        return "--";
      }

      return account.employeeCode ?? "--";
    case "name":
      if (isSystemAdmin) {
        return "Admin";
      }

      return account.name;
    case "department":
      if (isSystemAdmin) {
        return "--";
      }

      return account.department;
    case "signature":
    case "apps":
    case "extraDepartments":
    case "company":
    case "branch":
    case "position":
    case "updatedAt":
    case "lastLogin":
      return "--";
    case "createdAt":
      if (isSystemAdmin) {
        return "--";
      }

      return getDisplayDate(account);
    case "activatedAt":
      if (isSystemAdmin) {
        return "--";
      }

      return account.activatedAt ?? "--";
    case "combo":
      if (isSystemAdmin) {
        return "--";
      }

      return (
        <>
          {getLicenseLabel(account.role)}
          <span>{account.closedAt ? `(${account.closedAt})` : ""}</span>
        </>
      );
    case "customPermission":
      return account.customPermissionKeys.length > 0 ? "Có" : "Không";
    case "adminRole":
      return account.role === "system_admin" ? "Có" : "Không";
    case "status":
      return statusLabels[account.status];
    case "title":
      return account.title;
    case "email":
      return account.email;
    case "role":
      return account.role === "system_admin" ? "Admin" : "User";
    default:
      return "--";
  }
}

function getSortValue(columnKey: UserColumnKey, account: ManagedUserAccount, groupsById: Map<string, PermissionGroup>) {
  const isSystemAdmin = isSystemAdminAccount(account);

  switch (columnKey) {
    case "account":
      return getAccountName(account);
    case "group":
      return groupNameFor(account, groupsById);
    case "employeeCode":
    case "personnelId":
      if (isSystemAdmin) {
        return "";
      }

      return account.employeeCode ?? "";
    case "name":
      if (isSystemAdmin) {
        return "Admin";
      }

      return account.name;
    case "department":
      if (isSystemAdmin) {
        return "";
      }

      return account.department;
    case "createdAt":
      if (isSystemAdmin) {
        return "";
      }

      return getDisplayDate(account);
    case "activatedAt":
      if (isSystemAdmin) {
        return "";
      }

      return account.activatedAt ?? "";
    case "combo":
      if (isSystemAdmin) {
        return "";
      }

      return getLicenseLabel(account.role);
    case "customPermission":
      return String(account.customPermissionKeys.length);
    case "adminRole":
    case "role":
      return account.role;
    case "status":
      return statusLabels[account.status];
    case "title":
      return account.title;
    case "email":
      return account.email;
    default:
      return "";
  }
}

function ColumnToggle({
  column,
  isVisible,
  onToggle,
  showHandle
}: {
  column: UserColumn;
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

function ColumnVisibilityPanel({
  query,
  setQuery,
  visibleColumnKeys,
  onClose,
  onReset,
  onToggle
}: {
  query: string;
  setQuery: (value: string) => void;
  visibleColumnKeys: Set<UserColumnKey>;
  onClose: () => void;
  onReset: () => void;
  onToggle: (columnKey: UserColumnKey) => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (column: UserColumn) => column.label.toLowerCase().includes(normalizedQuery);
  const visibleColumns = userColumns.filter((column) => visibleColumnKeys.has(column.key) && matchesQuery(column));
  const hiddenColumns = userColumns.filter((column) => !visibleColumnKeys.has(column.key) && matchesQuery(column));

  return (
    <section className="admin-user-column-panel" aria-label="Trường hiển thị">
      <header>
        <h3>Trường hiển thị</h3>
        <button className="icon-button" type="button" aria-label="Đóng trường hiển thị" onClick={onClose}>
          <X size={18} weight="duotone" aria-hidden="true" />
        </button>
      </header>

      <label className="admin-user-column-search">
        <span className="sr-only">Tìm kiếm trường</span>
        <input value={query} type="search" placeholder="Tìm kiếm trường" onChange={(event) => setQuery(event.target.value)} />
        <MagnifyingGlass size={18} weight="duotone" aria-hidden="true" />
      </label>

      <div className="admin-user-column-list">
        {visibleColumns.map((column) => (
          <ColumnToggle
            column={column}
            isVisible
            key={column.key}
            showHandle
            onToggle={() => onToggle(column.key)}
          />
        ))}

        <h4>Đang ẩn</h4>
        {hiddenColumns.map((column) => (
          <ColumnToggle
            column={column}
            isVisible={false}
            key={column.key}
            onToggle={() => onToggle(column.key)}
          />
        ))}
        {visibleColumns.length + hiddenColumns.length === 0 ? (
          <p className="admin-user-column-empty">Không có trường phù hợp.</p>
        ) : null}
      </div>

      <footer>
        <button type="button" onClick={onReset}>
          Mặc định
        </button>
      </footer>
    </section>
  );
}

export function AdminUserListBoard({ data }: { data: AccountAccessData }) {
  const [activeFilter, setActiveFilter] = useState<UserListFilter>("active");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterPanel, setActiveFilterPanel] = useState<FilterPanel>(null);
  const [columnQuery, setColumnQuery] = useState("");
  const [sortColumnKey, setSortColumnKey] = useState<UserColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const filterRef = useRef<HTMLDivElement | null>(null);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<UserColumnKey>>(
    () => new Set(defaultVisibleColumnKeys)
  );
  const groupsById = useMemo(() => new Map(data.groups.map((group) => [group.id, group])), [data.groups]);
  const filteredAccounts = useMemo(
    () => data.accounts.filter((account) => matchesFilter(account, activeFilter)),
    [activeFilter, data.accounts]
  );
  const sortedAccounts = useMemo(() => {
    if (!sortColumnKey) {
      return filteredAccounts;
    }

    return [...filteredAccounts].sort((left, right) => {
      const leftValue = getSortValue(sortColumnKey, left, groupsById);
      const rightValue = getSortValue(sortColumnKey, right, groupsById);
      const result = leftValue.localeCompare(rightValue, "vi", { numeric: true, sensitivity: "base" });

      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredAccounts, groupsById, sortColumnKey, sortDirection]);
  const visibleAccounts = sortedAccounts.slice(0, 50);
  const visibleColumns = userColumns.filter((column) => visibleColumnKeys.has(column.key));
  const pageCount = Math.max(1, Math.ceil(Math.max(filteredAccounts.length, 1) / 50));
  const chooseSortColumn = (columnKey: UserColumnKey) => {
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
    setActiveFilterPanel(null);
    setIsFilterOpen(false);
  };

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const closeFilter = () => {
      setIsFilterOpen(false);
      setActiveFilterPanel(null);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) {
        closeFilter();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFilter();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFilterOpen]);

  const toggleColumn = (columnKey: UserColumnKey) => {
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

  return (
    <main className="admin-user-list-page" aria-label="Danh sách người dùng">
      <ApiStatusBanner data={data} />

      <nav className="admin-user-status-tabs" aria-label="Trạng thái người dùng">
        {tabOrder.map((tab) => (
          <button
            className={activeFilter === tab.key ? "is-active" : undefined}
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label} ({getTabCount(data.accounts, tab.key)})
          </button>
        ))}
      </nav>

      <section className="admin-user-toolbar" aria-label="Công cụ danh sách người dùng">
        <div className="admin-user-toolbar-left">
          <div className="admin-user-filter-wrap" ref={filterRef}>
            <button
              className={isFilterOpen ? "admin-user-filter-trigger is-active" : "admin-user-filter-trigger"}
              type="button"
              aria-label="Bộ lọc danh sách"
              aria-expanded={isFilterOpen}
              onClick={() => {
                setIsFilterOpen((current) => !current);
                setActiveFilterPanel(null);
              }}
            >
              <SlidersHorizontal size={19} strokeWidth={1.8} aria-hidden="true" />
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
                aria-label="Bộ lọc danh sách người dùng"
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
                  <div className="admin-user-submenu" role="group" aria-label="Chọn cột sắp xếp">
                    {sortColumns.map((column) => (
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
                  <ColumnVisibilityPanel
                    query={columnQuery}
                    setQuery={setColumnQuery}
                    visibleColumnKeys={visibleColumnKeys}
                    onClose={() => setActiveFilterPanel(null)}
                    onReset={() => {
                      setVisibleColumnKeys(new Set(defaultVisibleColumnKeys));
                      setColumnQuery("");
                    }}
                    onToggle={toggleColumn}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          <span>
            Hiển thị 1 - {visibleAccounts.length} / {filteredAccounts.length} bản ghi
          </span>
          <span>Trang: 01 / {String(pageCount).padStart(2, "0")}</span>
          <button className="icon-button" type="button" aria-label="Trang trước">
            <CaretLeft size={17} weight="duotone" aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="Trang sau">
            <CaretRight size={17} weight="duotone" aria-hidden="true" />
          </button>
        </div>

        <div className="admin-user-toolbar-actions">
          <button type="button">
            <Export size={16} weight="duotone" aria-hidden="true" />
            Export
          </button>
          <a href="/admin/settings/accounts/permissions">
            <GearSix size={16} weight="duotone" aria-hidden="true" />
            Cài đặt
          </a>
        </div>
      </section>

      <div className="admin-user-table-shell" tabIndex={0} aria-label="Bảng danh sách người dùng có thể cuộn ngang">
        <table className="admin-user-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Chọn</span>
              </th>
              {visibleColumns.map((column) => (
                <th scope="col" key={column.key}>
                  {column.label}
                  {column.key === "activatedAt" ? <span aria-hidden="true"> ↑</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleAccounts.map((account) => (
              <tr key={account.id}>
                <td>
                  <FormCheckbox className="admin-user-table-checkbox" label={<span className="sr-only">Chọn {account.name}</span>} />
                </td>
                {visibleColumns.map((column) =>
                  column.key === "account" ? (
                    <th scope="row" key={column.key}>
                      {renderColumnValue(column.key, account, groupsById)}
                    </th>
                  ) : (
                    <td key={column.key}>{renderColumnValue(column.key, account, groupsById)}</td>
                  )
                )}
              </tr>
            ))}
            {visibleAccounts.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1}>
                  <span className="account-empty-state">
                    Không có người dùng ở trạng thái {activeFilter in statusLabels ? statusLabels[activeFilter as AccountLifecycleStatus].toLowerCase() : "này"}.
                  </span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
