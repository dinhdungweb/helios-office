"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FormCheckbox, FormSelect } from "@/components/ui/form-controls";
import {
  createPermissionGroupAction,
  updatePermissionGroupAction,
  type GroupFormState
} from "@/lib/account-access-actions";
import type {
  AccountAccessData,
  AccountLicense,
  AccountLicensePlan,
  AccountPermission,
  AccountRole,
  ManagedUserAccount,
  PermissionGroup
} from "@/lib/account-access-api";
import {
  Check,
  CheckCircle,
  ClipboardText,
  Eye,
  Key,
  Lock,
  PencilSimple,
  Plus,
  ShieldCheck,
  Users,
  X
} from "@/lib/icons";

type GroupFilter = "all" | AccountRole | AccountLicensePlan;

const initialGroupState: GroupFormState = {
  ok: false
};

const roleLabels: Record<AccountRole, string> = {
  system_admin: "Admin hệ thống",
  user: "User"
};

const roleOptions: Array<{ value: AccountRole; label: string }> = [
  { value: "user", label: "User" },
  { value: "system_admin", label: "Admin hệ thống" }
];

function licenseLabel(licenses: AccountLicense[], licensePlan: AccountLicensePlan) {
  return licenses.find((license) => license.key === licensePlan)?.name ?? licensePlan.toUpperCase();
}

function minimumLicenseLabel(licensePlan: AccountLicensePlan) {
  return licensePlan.toUpperCase();
}

function permissionCategories(group: PermissionGroup, permissions: AccountPermission[]) {
  return Array.from(
    new Set(
      permissions
        .filter((permission) => group.permissionKeys.includes(permission.key))
        .map((permission) => permission.category)
    )
  );
}

function membersForGroup(groupId: string, accounts: ManagedUserAccount[]) {
  return accounts.filter((account) => account.groupId === groupId);
}

function GroupStatusBadge({ group }: { group: PermissionGroup }) {
  const isActive = group.memberCount > 0;

  return (
    <span className={isActive ? "group-status group-status--active" : "group-status group-status--paused"}>
      <CheckCircle size={14} weight="duotone" aria-hidden="true" />
      {isActive ? "Đang áp dụng" : "Chưa có người"}
    </span>
  );
}

function ApiStatusBanner({ data }: { data: AccountAccessData }) {
  if (data.source === "api") {
    return null;
  }

  return (
    <section className="account-api-banner" role="status">
      <strong>Chưa kết nối được Account API</strong>
      <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
    </section>
  );
}

function GroupEditorDialog({
  group,
  licenses,
  permissions,
  variant = "primary"
}: {
  group?: PermissionGroup;
  licenses: AccountLicense[];
  permissions: AccountPermission[];
  variant?: "icon" | "primary" | "secondary";
}) {
  const [state, formAction, isPending] = useActionState(
    group ? updatePermissionGroupAction : createPermissionGroupAction,
    initialGroupState
  );
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const selectedPermissions = new Set(group?.permissionKeys ?? []);
  const title = group ? "Sửa nhóm người dùng" : "Tạo nhóm người dùng";
  const triggerLabel = group ? "Sửa nhóm" : "Tạo nhóm";

  useEffect(() => {
    if (state.ok) {
      dialogRef.current?.close();
    }
  }, [state.ok]);

  const trigger =
    variant === "icon" ? (
      <button className="icon-button" type="button" aria-label={`Sửa nhóm ${group?.name ?? ""}`} onClick={() => dialogRef.current?.showModal()}>
        <PencilSimple size={16} weight="duotone" aria-hidden="true" />
      </button>
    ) : (
      <button className={variant === "primary" ? "primary-button" : "secondary-button"} type="button" onClick={() => dialogRef.current?.showModal()}>
        {group ? <PencilSimple size={16} weight="duotone" aria-hidden="true" /> : <Plus size={16} weight="duotone" aria-hidden="true" />}
        {triggerLabel}
      </button>
    );

  return (
    <>
      {trigger}
      <dialog className="account-dialog account-edit-dialog group-editor-dialog" ref={dialogRef}>
        <header className="account-dialog-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" aria-label="Đóng" onClick={() => dialogRef.current?.close()}>
            <X size={16} weight="duotone" aria-hidden="true" />
          </button>
        </header>

        <form className="account-dialog-form" action={formAction}>
          {group ? <input name="groupId" type="hidden" value={group.id} /> : null}

          <div className="account-dialog-grid">
            <label className="account-dialog-field">
              <span>Tên nhóm</span>
              <input name="name" type="text" required minLength={2} defaultValue={group?.name ?? ""} />
            </label>

            <label className="account-dialog-field">
              <span>Vai trò</span>
              <FormSelect
                ariaLabel="Chọn vai trò nhóm"
                defaultValue={group?.role ?? "user"}
                menuLabel="Vai trò nhóm"
                name="roleScope"
                options={roleOptions}
                placeholder="Chọn vai trò"
              />
            </label>

            <label className="account-dialog-field">
              <span>License</span>
              <FormSelect
                ariaLabel="Chọn license"
                defaultValue={group?.licensePlan ?? licenses[0]?.key ?? "standard"}
                menuLabel="Danh sách license"
                name="licensePlan"
                options={licenses.map((license) => ({
                  value: license.key,
                  label: license.name,
                  description: license.summary
                }))}
                placeholder="Chọn license"
              />
            </label>

            <label className="account-dialog-field account-dialog-field--wide">
              <span>Mô tả</span>
              <textarea name="description" rows={3} required minLength={2} defaultValue={group?.summary ?? ""} />
            </label>
          </div>

          <fieldset className="account-dialog-permissions">
            <legend>Quyền áp dụng</legend>
            <div className="account-dialog-permission-grid">
              {permissions.map((permission) => (
                <FormCheckbox
                  name="permissionKeys"
                  value={permission.key}
                  defaultChecked={selectedPermissions.has(permission.key)}
                  label={permission.label}
                  key={permission.key}
                />
              ))}
            </div>
          </fieldset>

          {state.error ? <p className="account-dialog-error">{state.error}</p> : null}

          <div className="account-dialog-actions">
            <button className="secondary-button" type="button" onClick={() => dialogRef.current?.close()}>
              <X size={16} weight="duotone" aria-hidden="true" />
              Hủy
            </button>
            <button className="primary-button" type="submit" disabled={isPending}>
              <CheckCircle size={16} weight="duotone" aria-hidden="true" />
              {isPending ? "Đang lưu" : "Lưu"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function UserGroupSummary({ groups }: { groups: PermissionGroup[] }) {
  const totalMembers = groups.reduce((total, group) => total + group.memberCount, 0);
  const activeGroups = groups.filter((group) => group.memberCount > 0).length;
  const configuredPermissions = new Set(groups.flatMap((group) => group.permissionKeys)).size;
  const summaryItems = [
    { label: "Nhóm quyền", value: groups.length, icon: Users },
    { label: "Đang áp dụng", value: activeGroups, icon: CheckCircle },
    { label: "Thành viên áp dụng", value: totalMembers, icon: ShieldCheck },
    { label: "Quyền đang dùng", value: configuredPermissions, icon: Key }
  ];

  return (
    <section className="account-summary-grid" aria-label="Tổng quan nhóm người dùng">
      {summaryItems.map((item) => (
        <article className="account-summary-card" key={item.label}>
          <span>
            <item.icon size={20} weight="duotone" aria-hidden="true" />
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

function GroupDirectoryPanel({
  filter,
  groups,
  licenses,
  onFilterChange,
  onSelectGroup,
  permissions,
  selectedGroup
}: {
  filter: GroupFilter;
  groups: PermissionGroup[];
  licenses: AccountLicense[];
  onFilterChange: (filter: GroupFilter) => void;
  onSelectGroup: (groupId: string) => void;
  permissions: AccountPermission[];
  selectedGroup?: PermissionGroup;
}) {
  const filteredGroups = groups.filter((group) => {
    if (filter === "all") {
      return true;
    }

    return group.role === filter || group.licensePlan === filter;
  });

  function selectByKeyboard(event: KeyboardEvent<HTMLTableRowElement>, groupId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectGroup(groupId);
    }
  }

  return (
    <section className="account-panel" aria-labelledby="group-directory-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-directory-title">Danh sách nhóm người dùng</h2>
          <p>Tạo nhóm theo vai trò, license và bộ quyền để phân quyền nhanh.</p>
        </div>
        <div className="account-panel-actions">
          <GroupEditorDialog licenses={licenses} permissions={permissions} />
        </div>
      </header>

      <div className="account-filter-row" aria-label="Bộ lọc nhóm người dùng">
        <button className={filter === "all" ? "is-selected" : undefined} type="button" onClick={() => onFilterChange("all")}>
          Tất cả nhóm
        </button>
        {roleOptions.map((role) => (
          <button className={filter === role.value ? "is-selected" : undefined} type="button" key={role.value} onClick={() => onFilterChange(role.value)}>
            {role.label}
          </button>
        ))}
        {licenses.map((license) => (
          <button className={filter === license.key ? "is-selected" : undefined} type="button" key={license.key} onClick={() => onFilterChange(license.key)}>
            {license.name}
          </button>
        ))}
      </div>

      <div className="group-table-shell" tabIndex={0} aria-label="Bảng nhóm người dùng có thể cuộn ngang">
        <table className="group-directory-table">
          <thead>
            <tr>
              <th scope="col">Nhóm</th>
              <th scope="col">Mã nhóm</th>
              <th scope="col">Thành viên</th>
              <th scope="col">License</th>
              <th scope="col">Quyền</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Tác vụ</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map((group) => {
              const categories = permissionCategories(group, permissions);

              return (
                <tr
                  className={group.id === selectedGroup?.id ? "is-selected" : undefined}
                  tabIndex={0}
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  onKeyDown={(event) => selectByKeyboard(event, group.id)}
                >
                  <th scope="row">
                    <strong>{group.name}</strong>
                    <small>{group.summary}</small>
                  </th>
                  <td><code>{group.id}</code></td>
                  <td>
                    <strong>{group.memberCount} người</strong>
                    <small>{roleLabels[group.role]}</small>
                  </td>
                  <td>{licenseLabel(licenses, group.licensePlan)}</td>
                  <td>
                    <strong>{group.permissionKeys.length} quyền</strong>
                    <small>{categories.length > 0 ? categories.join(" · ") : "Chưa cấu hình quyền"}</small>
                  </td>
                  <td><GroupStatusBadge group={group} /></td>
                  <td>
                    <div className="account-row-actions">
                      <GroupEditorDialog group={group} licenses={licenses} permissions={permissions} variant="icon" />
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <span className="account-empty-state">Không có nhóm phù hợp bộ lọc.</span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PermissionMatrixPanel({
  group,
  licenses,
  permissions
}: {
  group?: PermissionGroup;
  licenses: AccountLicense[];
  permissions: AccountPermission[];
}) {
  if (!group) {
    return (
      <section className="account-panel">
        <p className="account-empty-state">Chưa có nhóm để hiển thị quyền.</p>
      </section>
    );
  }

  const selectedKeys = new Set(group.permissionKeys);

  return (
    <section className="account-panel" aria-labelledby="group-matrix-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-matrix-title">Ma trận quyền: {group.name}</h2>
          <p>Danh mục quyền hiệu lực theo nhóm đang chọn.</p>
        </div>
        <div className="account-panel-actions">
          <a className="secondary-button" href="/admin/settings/accounts/permissions">
            <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
            Quyền chi tiết
          </a>
          <GroupEditorDialog group={group} licenses={licenses} permissions={permissions} variant="secondary" />
        </div>
      </header>

      <div className="group-table-shell" tabIndex={0} aria-label="Ma trận phân quyền nhóm có thể cuộn ngang">
        <table className="group-permission-table">
          <thead>
            <tr>
              <th scope="col">Quyền</th>
              <th scope="col">Danh mục</th>
              <th scope="col">License tối thiểu</th>
              <th scope="col">Admin</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => {
              const isAllowed = selectedKeys.has(permission.key);

              return (
                <tr key={permission.key}>
                  <th scope="row">
                    <strong>{permission.label}</strong>
                    <small>{permission.key}</small>
                  </th>
                  <td>{permission.category}</td>
                  <td>{minimumLicenseLabel(permission.minimumLicense)}</td>
                  <td>{permission.adminOnly ? "Có" : "Không"}</td>
                  <td>
                    <span className={isAllowed ? "group-action-check is-allowed" : "group-action-check"}>
                      {isAllowed ? (
                        <Check size={14} weight="duotone" aria-label="Được cấp" />
                      ) : (
                        <Lock size={14} weight="duotone" aria-label="Chưa cấp" />
                      )}
                    </span>
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

function GroupIdentityPanel({
  group,
  licenses,
  permissions
}: {
  group?: PermissionGroup;
  licenses: AccountLicense[];
  permissions: AccountPermission[];
}) {
  if (!group) {
    return null;
  }

  return (
    <section className="account-panel" aria-labelledby="group-identity-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-identity-title">{group.name}</h2>
          <p>{group.id} · {licenseLabel(licenses, group.licensePlan)}</p>
        </div>
        <GroupStatusBadge group={group} />
      </header>

      <div className="group-detail-list">
        <article>
          <span><Users size={17} weight="duotone" aria-hidden="true" /></span>
          <div>
            <h3>Thành viên</h3>
            <p>{group.memberCount} người đang áp dụng nhóm này</p>
          </div>
        </article>
        <article>
          <span><Eye size={17} weight="duotone" aria-hidden="true" /></span>
          <div>
            <h3>Vai trò</h3>
            <p>{roleLabels[group.role]}</p>
          </div>
        </article>
        <article>
          <span><Key size={17} weight="duotone" aria-hidden="true" /></span>
          <div>
            <h3>Quyền hiệu lực</h3>
            <p>{group.permissionKeys.length}/{permissions.length} quyền được cấu hình</p>
          </div>
        </article>
      </div>
    </section>
  );
}

function MemberPanel({ accounts, group }: { accounts: ManagedUserAccount[]; group?: PermissionGroup }) {
  if (!group) {
    return null;
  }

  const members = membersForGroup(group.id, accounts);

  return (
    <section className="account-panel" aria-labelledby="group-member-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-member-title">Thành viên</h2>
          <p>Tài khoản đang gán trực tiếp vào nhóm.</p>
        </div>
      </header>

      <div className="group-source-list">
        {members.map((member) => (
          <article key={member.id}>
            <span>{member.employeeCode ?? "User"}</span>
            <strong>{member.name}</strong>
            <p>{member.email}</p>
          </article>
        ))}
        {members.length === 0 ? <p className="account-empty-state">Chưa có tài khoản nào thuộc nhóm này.</p> : null}
      </div>
    </section>
  );
}

function PermissionCategoryPanel({
  group,
  permissions
}: {
  group?: PermissionGroup;
  permissions: AccountPermission[];
}) {
  if (!group) {
    return null;
  }

  const categories = permissionCategories(group, permissions);

  return (
    <section className="account-panel" aria-labelledby="group-category-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-category-title">Danh mục quyền</h2>
          <p>Nhóm quyền đang được mở theo từng mảng nghiệp vụ.</p>
        </div>
      </header>

      <div className="group-chip-list">
        {categories.map((category) => (
          <span key={category}>{category}</span>
        ))}
        {categories.length === 0 ? <span>Chưa cấu hình</span> : null}
      </div>
    </section>
  );
}

function LicenseModulePanel({ group, licenses }: { group?: PermissionGroup; licenses: AccountLicense[] }) {
  if (!group) {
    return null;
  }

  const license = licenses.find((item) => item.key === group.licensePlan);

  return (
    <section className="account-panel" aria-labelledby="group-license-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-license-title">Module theo license</h2>
          <p>{license?.summary ?? "License áp dụng cho nhóm."}</p>
        </div>
      </header>

      <div className="group-chip-list">
        {(license?.modules ?? []).map((module) => (
          <span key={module}>{module}</span>
        ))}
      </div>
    </section>
  );
}

function GroupToolsPanel({ group, licenses, permissions }: { group?: PermissionGroup; licenses: AccountLicense[]; permissions: AccountPermission[] }) {
  if (!group) {
    return null;
  }

  const tools = [
    {
      title: "Sửa nhóm",
      body: "Cập nhật tên, mô tả, license và các quyền áp dụng cho nhóm.",
      icon: PencilSimple
    },
    {
      title: "Quyền cá nhân",
      body: "Kiểm tra các tài khoản đang được cấp thêm quyền riêng ngoài nhóm.",
      icon: ClipboardText
    },
    {
      title: "Quyền chi tiết",
      body: "Đi sâu vào từng đối tượng, phạm vi dữ liệu và field-level security.",
      icon: ShieldCheck
    }
  ];

  return (
    <section className="account-panel" aria-labelledby="group-tools-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-tools-title">Tác vụ nhóm</h2>
          <p>Thao tác nhanh cho Admin khi quản lý nhóm.</p>
        </div>
      </header>

      <div className="group-tool-list">
        {tools.map((tool) => (
          <article key={tool.title}>
            <span>
              <tool.icon size={17} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{tool.title}</h3>
              <p>{tool.body}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="group-chip-list">
        <GroupEditorDialog group={group} licenses={licenses} permissions={permissions} variant="secondary" />
      </div>
    </section>
  );
}

function GroupExamplePanel() {
  return (
    <section className="group-example-panel" aria-label="Ghi chú cài đặt nhóm">
      <span>
        <ShieldCheck size={18} weight="duotone" aria-hidden="true" />
      </span>
      <div>
        <h2>Luồng phân quyền hiện tại</h2>
        <p>Nhóm người dùng đang được lưu trong Account API. Khi Admin tạo hoặc sửa nhóm, tài khoản đang gán nhóm sẽ nhận lại quyền hiệu lực theo permission keys của nhóm đó.</p>
      </div>
    </section>
  );
}

export function UserGroupSettingsBoard({ data }: { data: AccountAccessData }) {
  const [selectedGroupId, setSelectedGroupId] = useState(data.groups[0]?.id ?? "");
  const [filter, setFilter] = useState<GroupFilter>("all");

  useEffect(() => {
    if (!data.groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(data.groups[0]?.id ?? "");
    }
  }, [data.groups, selectedGroupId]);

  const selectedGroup = useMemo(
    () => data.groups.find((group) => group.id === selectedGroupId) ?? data.groups[0],
    [data.groups, selectedGroupId]
  );

  return (
    <main className="account-access-page user-group-page" aria-label="Cài đặt nhóm người dùng">
      <ApiStatusBanner data={data} />

      <section className="org-page-heading" aria-labelledby="user-group-page-title">
        <div>
          <span>Cài đặt hệ thống · Tài khoản người dùng</span>
          <h1 id="user-group-page-title">Nhóm người dùng</h1>
          <p>Tạo nhóm vai trò, gán bộ quyền và kiểm tra tài khoản đang áp dụng nhóm quyền.</p>
        </div>
        <a className="secondary-button" href="/admin/settings/accounts">
          Quay lại tài khoản
        </a>
      </section>

      <UserGroupSummary groups={data.groups} />

      <section className="account-access-layout user-group-layout" aria-label="Thiết lập nhóm người dùng">
        <div className="account-access-main">
          <GroupDirectoryPanel
            filter={filter}
            groups={data.groups}
            licenses={data.licenses}
            onFilterChange={setFilter}
            onSelectGroup={setSelectedGroupId}
            permissions={data.permissions}
            selectedGroup={selectedGroup}
          />
          <PermissionMatrixPanel group={selectedGroup} licenses={data.licenses} permissions={data.permissions} />
          <GroupExamplePanel />
        </div>

        <aside className="account-access-side" aria-label="Chi tiết nhóm đang chọn">
          <GroupIdentityPanel group={selectedGroup} licenses={data.licenses} permissions={data.permissions} />
          <MemberPanel accounts={data.accounts} group={selectedGroup} />
          <PermissionCategoryPanel group={selectedGroup} permissions={data.permissions} />
          <LicenseModulePanel group={selectedGroup} licenses={data.licenses} />
          <GroupToolsPanel group={selectedGroup} licenses={data.licenses} permissions={data.permissions} />
        </aside>
      </section>
    </main>
  );
}
