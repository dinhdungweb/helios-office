"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ResponsiveToolbarActionMenu } from "@/components/admin/responsive-toolbar-action-menu";
import { FormCheckbox } from "@/components/ui/form-controls";
import { Export, GearSix, List, Lock, SlidersHorizontal, Trash } from "@/lib/icons";
import type { AccountAccessData, ManagedUserAccount, PermissionGroup } from "@/lib/account-access-api";
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

export function UserGroupListBoard({ data }: { data: AccountAccessData }) {
  const router = useRouter();
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => new Set());
  const rows = useMemo(() => buildRows(data), [data]);
  const visibleRows = rows.slice(0, 50);
  const visibleRowIds = visibleRows.map((row) => row.group.id);
  const selectedVisibleCount = visibleRowIds.filter((id) => selectedGroupIds.has(id)).length;
  const areAllVisibleRowsSelected = visibleRowIds.length > 0 && selectedVisibleCount === visibleRowIds.length;
  const isSomeVisibleRowSelected = selectedVisibleCount > 0 && !areAllVisibleRowsSelected;
  const selectedRowCount = selectedGroupIds.size;
  const hasSelectedRows = selectedRowCount > 0;

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

  return (
    <main className="admin-user-list-page admin-group-list-page" aria-label="Danh sách nhóm">
      <ApiStatusBanner data={data} />

      {hasSelectedRows ? (
        <section className="department-directory-bulk-actions admin-group-bulk-actions" aria-label="Thao tác với nhóm đã chọn">
          <button type="button">
            <Export size={16} weight="duotone" aria-hidden="true" />
            <span>Export</span>
          </button>
          <button type="button">
            <Lock size={16} weight="duotone" aria-hidden="true" />
            <span>Đóng</span>
          </button>
          <button type="button">
            <Trash size={16} weight="duotone" aria-hidden="true" />
            <span>Xóa</span>
          </button>
        </section>
      ) : (
        <section className="admin-group-list-strip" aria-label="Chế độ danh sách nhóm">
          <List size={18} weight="duotone" aria-hidden="true" />
        </section>
      )}

      <section className="admin-user-toolbar admin-group-toolbar has-responsive-actions" aria-label="Công cụ danh sách nhóm">
        <div className="admin-user-toolbar-left">
          <button className="admin-user-filter-trigger" type="button" aria-label="Bộ lọc danh sách nhóm">
            <SlidersHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
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
                label: "Export"
              },
              {
                key: "settings",
                href: "/admin/settings/accounts/permissions",
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
              <th scope="col">Tên nhóm</th>
              <th scope="col">Quản trị hệ thống</th>
              <th scope="col">Nhóm mặc định</th>
              <th scope="col">Tài khoản hoạt động</th>
              <th scope="col">Tài khoản bị khóa</th>
              <th scope="col">Người tạo</th>
              <th scope="col">Người sửa</th>
              <th scope="col">Ngày tạo</th>
              <th scope="col">Ngày sửa</th>
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
                <th scope="row">
                  <a className="admin-group-name" href={groupDetailHref(row.group.id)}>
                    {row.group.name}
                  </a>
                </th>
                <td>{hasGroupSystemPermissions(row.group.permissionKeys) ? "Có" : "Không"}</td>
                <td>{row.defaultGroup ? "Có" : "Không"}</td>
                <td>{row.activeAccounts}</td>
                <td>{row.lockedAccounts}</td>
                <td>
                  <GroupAuditAvatar label={row.creatorAvatar} />
                </td>
                <td>
                  <GroupAuditAvatar label={row.updaterAvatar} />
                </td>
                <td>{row.createdAt}</td>
                <td>{row.updatedAt}</td>
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={10}>
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
