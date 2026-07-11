"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AccountEditDialog } from "@/components/admin/account-editor-dialog";
import { AccountProvisionDialog } from "@/components/admin/account-provision-dialog";
import { FormCheckbox } from "@/components/ui/form-controls";
import {
  activateAccountAction,
  closeAccountAction
} from "@/lib/account-access-actions";
import type {
  AccountLicense,
  AccountLicensePlan,
  AccountLifecycleStatus,
  AccountPermission,
  AccountProvisionEmployee,
  AccountRole,
  ManagedUserAccount,
  PermissionGroup
} from "@/lib/account-access-api";
import {
  CheckCircle,
  Clock,
  FunnelSimple,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X
} from "@/lib/icons";

const roleLabels: Record<AccountRole, string> = {
  system_admin: "Admin",
  user: "User"
};

const licenseLabels: Record<AccountLicensePlan, string> = {
  standard: "STANDARD",
  professional: "PROFESSIONAL",
  enterprise: "ENTERPRISE"
};

const statusLabels: Record<AccountLifecycleStatus, string> = {
  pending_activation: "Chưa kích hoạt",
  active: "Đang hoạt động",
  closed: "Đã đóng"
};

const statusIcons = {
  pending_activation: Clock,
  active: CheckCircle,
  closed: X
};

const statusFilters: AccountLifecycleStatus[] = ["active", "pending_activation", "closed"];

type QuickFilter = "all" | AccountLifecycleStatus | AccountLicensePlan;
type CustomPermissionFilter = "all" | "custom" | "standard";
type ColumnKey = "role" | "license" | "group" | "status" | "effective";

type AccountAccessMaps = {
  groupById: Map<string, PermissionGroup>;
  permissionByKey: Map<string, AccountPermission>;
};

const columnOptions: Array<{ key: ColumnKey; label: string }> = [
  { key: "role", label: "Quyền" },
  { key: "license", label: "License" },
  { key: "group", label: "Nhóm quyền" },
  { key: "status", label: "Trạng thái" },
  { key: "effective", label: "Hiệu lực" }
];

const defaultVisibleColumns = new Set<ColumnKey>(columnOptions.map((column) => column.key));

function getEffectivePermissions(account: ManagedUserAccount, maps: AccountAccessMaps) {
  const group = account.groupId ? maps.groupById.get(account.groupId) : null;
  const permissionKeys = Array.from(
    new Set([...(group?.permissionKeys ?? []), ...account.customPermissionKeys])
  );

  return permissionKeys
    .map((permissionKey) => maps.permissionByKey.get(permissionKey))
    .filter(Boolean);
}

function AccountStatusBadge({ status }: { status: AccountLifecycleStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <span className={`account-status account-status--${status}`}>
      <StatusIcon size={14} weight="duotone" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function AccountAvatar({ account }: { account: ManagedUserAccount }) {
  const hasCustomPermissions = account.customPermissionKeys.length > 0;

  return (
    <span className="account-avatar">
      <span>{account.avatar}</span>
      {hasCustomPermissions ? (
        <span className="account-avatar-star" aria-label="Có quyền tùy chỉnh riêng">
          <Star size={12} weight="fill" aria-hidden="true" />
        </span>
      ) : null}
    </span>
  );
}

function AccountRowActions({
  account,
  groups,
  licenses,
  permissions
}: {
  account: ManagedUserAccount;
  groups: PermissionGroup[];
  licenses: AccountLicense[];
  permissions: AccountPermission[];
}) {
  return (
    <div className="account-row-actions">
      {account.status !== "active" ? (
        <form action={activateAccountAction}>
          <input name="accountId" type="hidden" value={account.id} />
          <button className="icon-button" type="submit" aria-label={`Kích hoạt ${account.name}`} title="Kích hoạt">
            <CheckCircle size={16} weight="duotone" aria-hidden="true" />
          </button>
        </form>
      ) : null}
      {account.status !== "closed" ? (
        <form action={closeAccountAction}>
          <input name="accountId" type="hidden" value={account.id} />
          <button className="icon-button" type="submit" aria-label={`Đóng ${account.name}`} title="Đóng tài khoản">
            <X size={16} weight="duotone" aria-hidden="true" />
          </button>
        </form>
      ) : null}
      <AccountEditDialog account={account} groups={groups} licenses={licenses} permissions={permissions} />
    </div>
  );
}

function useToolbarMenu() {
  const [openMenu, setOpenMenu] = useState<"filter" | "columns" | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  return { openMenu, setOpenMenu, rootRef };
}

function countByStatus(accounts: ManagedUserAccount[], status: AccountLifecycleStatus) {
  return accounts.filter((account) => account.status === status).length;
}

function countByLicense(accounts: ManagedUserAccount[], license: AccountLicensePlan) {
  return accounts.filter((account) => account.licensePlan === license).length;
}

function FilterChip({
  isSelected,
  label,
  count,
  onClick
}: {
  isSelected: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button className={isSelected ? "is-selected" : undefined} type="button" onClick={onClick}>
      <span>{label}</span>
      <strong>{count}</strong>
    </button>
  );
}

function FilterOption({
  isSelected,
  label,
  meta,
  onClick
}: {
  isSelected: boolean;
  label: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button className={isSelected ? "is-selected" : undefined} type="button" onClick={onClick}>
      <span>{label}</span>
      {meta ? <small>{meta}</small> : null}
    </button>
  );
}

export function AccountManagedTable({
  accounts,
  availableEmployees,
  groups,
  licenses,
  permissions
}: {
  accounts: ManagedUserAccount[];
  availableEmployees: AccountProvisionEmployee[];
  groups: PermissionGroup[];
  licenses: AccountLicense[];
  permissions: AccountPermission[];
}) {
  const { openMenu, setOpenMenu, rootRef } = useToolbarMenu();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [roleFilter, setRoleFilter] = useState<AccountRole | "all">("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [customFilter, setCustomFilter] = useState<CustomPermissionFilter>("all");
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);

  const maps = useMemo<AccountAccessMaps>(
    () => ({
      groupById: new Map(groups.map((group) => [group.id, group])),
      permissionByKey: new Map(permissions.map((permission) => [permission.key, permission]))
    }),
    [groups, permissions]
  );

  const filteredAccounts = useMemo(
    () =>
      accounts.filter((account) => {
        if (quickFilter !== "all") {
          if (statusFilters.includes(quickFilter as AccountLifecycleStatus)) {
            if (account.status !== quickFilter) {
              return false;
            }
          } else if (account.licensePlan !== quickFilter) {
            return false;
          }
        }

        if (roleFilter !== "all" && account.role !== roleFilter) {
          return false;
        }

        if (groupFilter !== "all" && (account.groupId ?? "none") !== groupFilter) {
          return false;
        }

        if (customFilter === "custom" && account.customPermissionKeys.length === 0) {
          return false;
        }

        if (customFilter === "standard" && account.customPermissionKeys.length > 0) {
          return false;
        }

        return true;
      }),
    [accounts, customFilter, groupFilter, quickFilter, roleFilter]
  );

  const activeFilterCount =
    (quickFilter === "all" ? 0 : 1) +
    (roleFilter === "all" ? 0 : 1) +
    (groupFilter === "all" ? 0 : 1) +
    (customFilter === "all" ? 0 : 1);

  function resetFilters() {
    setQuickFilter("all");
    setRoleFilter("all");
    setGroupFilter("all");
    setCustomFilter("all");
  }

  function toggleColumn(column: ColumnKey) {
    setVisibleColumns((current) => {
      const next = new Set(current);

      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }

      return next;
    });
  }

  return (
    <section className="account-panel account-table-panel" aria-labelledby="account-table-title">
      <header className="account-panel-header">
        <div>
          <h2 id="account-table-title">Tài khoản người dùng</h2>
          <p>
            {filteredAccounts.length}/{accounts.length} hồ sơ đăng nhập
          </p>
        </div>
        <div className="account-panel-actions account-toolbar" ref={rootRef}>
          <a className="secondary-button" href="/admin/settings/accounts/device-auth">
            <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
            Xác thực thiết bị
          </a>

          <div className="account-toolbar-item">
            <button
              className={activeFilterCount > 0 ? "secondary-button is-active" : "secondary-button"}
              type="button"
              aria-expanded={openMenu === "filter"}
              onClick={() => setOpenMenu((current) => (current === "filter" ? null : "filter"))}
            >
              <FunnelSimple size={16} weight="duotone" aria-hidden="true" />
              Bộ lọc
              {activeFilterCount > 0 ? <span className="account-toolbar-count">{activeFilterCount}</span> : null}
            </button>

            {openMenu === "filter" ? (
              <div className="account-toolbar-menu account-filter-menu">
                <section>
                  <h3>Quyền</h3>
                  <div className="account-option-list">
                    <FilterOption isSelected={roleFilter === "all"} label="Tất cả" onClick={() => setRoleFilter("all")} />
                    <FilterOption isSelected={roleFilter === "system_admin"} label="Admin" onClick={() => setRoleFilter("system_admin")} />
                    <FilterOption isSelected={roleFilter === "user"} label="User" onClick={() => setRoleFilter("user")} />
                  </div>
                </section>

                <section>
                  <h3>Nhóm quyền</h3>
                  <div className="account-option-list">
                    <FilterOption isSelected={groupFilter === "all"} label="Tất cả" onClick={() => setGroupFilter("all")} />
                    <FilterOption isSelected={groupFilter === "none"} label="Chưa gán" onClick={() => setGroupFilter("none")} />
                    {groups.map((group) => (
                      <FilterOption
                        isSelected={groupFilter === group.id}
                        label={group.name}
                        meta={licenseLabels[group.licensePlan]}
                        key={group.id}
                        onClick={() => setGroupFilter(group.id)}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h3>Quyền cá nhân</h3>
                  <div className="account-option-list">
                    <FilterOption isSelected={customFilter === "all"} label="Tất cả" onClick={() => setCustomFilter("all")} />
                    <FilterOption isSelected={customFilter === "custom"} label="Có quyền riêng" onClick={() => setCustomFilter("custom")} />
                    <FilterOption isSelected={customFilter === "standard"} label="Không có quyền riêng" onClick={() => setCustomFilter("standard")} />
                  </div>
                </section>

                <footer>
                  <button className="secondary-button" type="button" onClick={resetFilters}>
                    Đặt lại
                  </button>
                </footer>
              </div>
            ) : null}
          </div>

          <div className="account-toolbar-item">
            <button
              className="secondary-button"
              type="button"
              aria-expanded={openMenu === "columns"}
              onClick={() => setOpenMenu((current) => (current === "columns" ? null : "columns"))}
            >
              <SlidersHorizontal size={16} weight="duotone" aria-hidden="true" />
              Cột
            </button>

            {openMenu === "columns" ? (
              <div className="account-toolbar-menu account-column-menu">
                <section>
                  <h3>Cột hiển thị</h3>
                  <div className="account-column-list">
                    {columnOptions.map((column) => (
                      <FormCheckbox
                        checked={visibleColumns.has(column.key)}
                        label={column.label}
                        key={column.key}
                        onChange={() => toggleColumn(column.key)}
                      />
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </div>

          <AccountProvisionDialog employees={availableEmployees} groups={groups} licenses={licenses} />
        </div>
      </header>

      <div className="account-filter-row" aria-label="Bộ lọc nhanh">
        <FilterChip isSelected={quickFilter === "all"} label="Tất cả" count={accounts.length} onClick={() => setQuickFilter("all")} />
        {statusFilters.map((status) => (
          <FilterChip
            isSelected={quickFilter === status}
            label={statusLabels[status]}
            count={countByStatus(accounts, status)}
            key={status}
            onClick={() => setQuickFilter(status)}
          />
        ))}
        {licenses.map((license) => (
          <FilterChip
            isSelected={quickFilter === license.key}
            label={license.name}
            count={countByLicense(accounts, license.key)}
            key={license.key}
            onClick={() => setQuickFilter(license.key)}
          />
        ))}
      </div>

      <div className="account-table-shell" tabIndex={0} aria-label="Bảng tài khoản có thể cuộn ngang">
        <table className="account-table">
          <thead>
            <tr>
              <th scope="col">Nhân sự</th>
              {visibleColumns.has("role") ? <th scope="col">Quyền</th> : null}
              {visibleColumns.has("license") ? <th scope="col">License</th> : null}
              {visibleColumns.has("group") ? <th scope="col">Nhóm quyền</th> : null}
              {visibleColumns.has("status") ? <th scope="col">Trạng thái</th> : null}
              {visibleColumns.has("effective") ? <th scope="col">Hiệu lực</th> : null}
              <th scope="col">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((account) => {
              const group = account.groupId ? maps.groupById.get(account.groupId) : null;
              const effectivePermissions = getEffectivePermissions(account, maps);

              return (
                <tr key={account.id}>
                  <th scope="row">
                    <span className="account-person-cell">
                      <AccountAvatar account={account} />
                      <span>
                        <strong>{account.name}</strong>
                        <small>{account.employeeCode ?? "Chưa có mã"} · {account.email}</small>
                      </span>
                    </span>
                  </th>
                  {visibleColumns.has("role") ? (
                    <td>
                      <span className={`account-role account-role--${account.role}`}>
                        {roleLabels[account.role]}
                      </span>
                      <small>{account.title}</small>
                    </td>
                  ) : null}
                  {visibleColumns.has("license") ? (
                    <td>
                      <span className={`account-license account-license--${account.licensePlan}`}>
                        {licenseLabels[account.licensePlan]}
                      </span>
                    </td>
                  ) : null}
                  {visibleColumns.has("group") ? (
                    <td>
                      <strong>{group?.name ?? "Chưa gán"}</strong>
                      <small>{effectivePermissions.length} quyền hiệu lực</small>
                    </td>
                  ) : null}
                  {visibleColumns.has("status") ? (
                    <td>
                      <AccountStatusBadge status={account.status} />
                      {account.status === "closed" ? <small>Không tính phí license</small> : null}
                    </td>
                  ) : null}
                  {visibleColumns.has("effective") ? (
                    <td>
                      <span>{account.activatedAt ?? "Chờ cấp"}</span>
                      {account.closedAt ? <small>Đóng: {account.closedAt}</small> : null}
                    </td>
                  ) : null}
                  <td>
                    <AccountRowActions account={account} groups={groups} licenses={licenses} permissions={permissions} />
                  </td>
                </tr>
              );
            })}
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.size + 2}>
                  <span className="account-empty-state">Không có tài khoản phù hợp bộ lọc.</span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
