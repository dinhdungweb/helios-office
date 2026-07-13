"use client";

import { Fragment, useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FormCheckbox, FormSelect } from "@/components/ui/form-controls";
import { updateAccountAction, type AccountFormState } from "@/lib/account-access-actions";
import { CalendarBlank, CaretDown, CheckCircle, Eye, X } from "@/lib/icons";
import type {
  AccountAccessData,
  AccountLifecycleStatus,
  AccountPermission,
  ManagedUserAccount,
  PermissionGroup
} from "@/lib/account-access-api";

const initialState: AccountFormState = {
  ok: false
};

const roleOptions = [{ value: "user", label: "Người dùng" }];

const statusOptions: Array<{ value: AccountLifecycleStatus; label: string }> = [
  { value: "active", label: "Kích hoạt" },
  { value: "pending_activation", label: "Chờ kích hoạt" },
  { value: "closed", label: "Đã khóa" }
];

type EditSectionKey = "login" | "permissions";

function accountLogin(account: ManagedUserAccount) {
  return account.email.includes("@") ? account.email.split("@")[0] : account.email;
}

function stablePhone(account: ManagedUserAccount) {
  const source = `${account.employeeCode ?? account.id}${account.email}`;
  const digits = Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0);

  return `09${String(78000000 + (digits % 999999)).padStart(8, "0")}`;
}

function groupPermissions(groupId: string, groups: PermissionGroup[]) {
  return groups.find((group) => group.id === groupId)?.permissionKeys ?? [];
}

function groupPermissionsByCategory(permissions: AccountPermission[]) {
  return permissions.reduce<Array<{ category: string; items: AccountPermission[] }>>((groups, permission) => {
    const existing = groups.find((group) => group.category === permission.category);

    if (existing) {
      existing.items.push(permission);
    } else {
      groups.push({ category: permission.category, items: [permission] });
    }

    return groups;
  }, []);
}

function permissionActionText(permission: AccountPermission, column: "manage" | "view" | "create") {
  if (permission.adminOnly && column !== "manage") {
    return "--";
  }

  if (column === "manage") {
    return "Quản lý tất cả";
  }

  if (column === "view") {
    return permission.key.includes("create") ? "Không có" : "Xem tất cả";
  }

  return permission.key.includes("view") ? "Không có" : "Tạo mới";
}

function PermissionActionControl({
  disabled,
  label
}: {
  disabled?: boolean;
  label: string;
}) {
  return (
    <button className={disabled ? "admin-user-edit-permission-control is-disabled" : "admin-user-edit-permission-control"} type="button" disabled={disabled}>
      <span>{label}</span>
      {disabled || label === "Không có" ? <CaretDown size={15} weight="duotone" aria-hidden="true" /> : <X size={15} weight="duotone" aria-hidden="true" />}
    </button>
  );
}

function FloatingField({
  children,
  label,
  required,
  wide
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "admin-user-edit-field is-wide" : "admin-user-edit-field"}>
      <span>
        {label}
        {required ? <mark>*</mark> : null}
      </span>
      {children}
    </label>
  );
}

export function AdminUserEditBoard({
  account,
  data
}: {
  account: ManagedUserAccount;
  data: AccountAccessData;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateAccountAction, initialState);
  const assignableGroups = useMemo(
    () => data.groups.filter((group) => group.role === "user" && (group.status !== "archived" || group.id === account.groupId)),
    [account.groupId, data.groups]
  );
  const initialGroupId = account.groupId ?? assignableGroups[0]?.id ?? "";
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [isPasswordChangeEnabled, setIsPasswordChangeEnabled] = useState(false);
  const [isCustomPermission, setIsCustomPermission] = useState(account.customPermissionKeys.length > 0);
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<Set<string>>(
    () => new Set(account.effectivePermissionKeys.length > 0 ? account.effectivePermissionKeys : groupPermissions(initialGroupId, data.groups))
  );
  const [collapsedSections, setCollapsedSections] = useState<Set<EditSectionKey>>(() => new Set());
  const groupedPermissions = useMemo(() => groupPermissionsByCategory(data.permissions), [data.permissions]);

  const isSectionCollapsed = (sectionKey: EditSectionKey) => collapsedSections.has(sectionKey);
  const toggleSection = (sectionKey: EditSectionKey) => {
    setCollapsedSections((current) => {
      const next = new Set(current);

      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }

      return next;
    });
  };

  useEffect(() => {
    if (state.ok) {
      router.push(`/admin/settings/accounts/${encodeURIComponent(account.id)}`);
      router.refresh();
    }
  }, [account.id, router, state.ok]);

  const setPermissionChecked = (permissionKey: string, checked: boolean) => {
    setSelectedPermissionKeys((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(permissionKey);
      } else {
        next.delete(permissionKey);
      }

      return next;
    });
  };

  const setCategoryChecked = (permissionKeys: string[], checked: boolean) => {
    setSelectedPermissionKeys((current) => {
      const next = new Set(current);

      for (const permissionKey of permissionKeys) {
        if (checked) {
          next.add(permissionKey);
        } else {
          next.delete(permissionKey);
        }
      }

      return next;
    });
  };

  const toggleCustomPermission = (checked: boolean) => {
    setIsCustomPermission(checked);

    if (checked && selectedPermissionKeys.size === 0) {
      setSelectedPermissionKeys(new Set(groupPermissions(selectedGroupId, data.groups)));
    }
  };

  return (
    <main className="admin-user-edit-page" aria-label={`Sửa tài khoản ${account.name}`}>
      <form className="admin-user-edit-form" action={formAction}>
        <input name="accountId" type="hidden" value={account.id} />
        <input name="email" type="hidden" value={account.email} />
        <input name="displayName" type="hidden" value={account.name} />
        <input name="adminRole" type="hidden" value={account.role} />
        <input name="customPermissionNote" type="hidden" value={account.customPermissionNote ?? ""} />

        <section className="admin-user-edit-section" aria-labelledby="admin-user-edit-login-title">
          <header>
            <h2 id="admin-user-edit-login-title">
              <button
                className={isSectionCollapsed("login") ? "admin-user-edit-section-toggle is-collapsed" : "admin-user-edit-section-toggle"}
                type="button"
                aria-controls="admin-user-edit-login-body"
                aria-expanded={!isSectionCollapsed("login")}
                onClick={() => toggleSection("login")}
              >
                <CaretDown size={18} weight="duotone" aria-hidden="true" />
                <span>Thông tin đăng nhập</span>
              </button>
            </h2>
          </header>

          {!isSectionCollapsed("login") ? (
          <div className="admin-user-edit-section-body" id="admin-user-edit-login-body">
          <div className="admin-user-edit-grid">
            <FloatingField label="Hồ sơ nhân sự">
              <input type="text" value={account.name} readOnly />
            </FloatingField>
            <FloatingField label="Tài khoản" required>
              <input name="username" type="text" value={accountLogin(account)} readOnly />
            </FloatingField>
            <FloatingField label="Phòng ban" wide>
              <div className="admin-user-edit-static-select">
                <span>{account.department}</span>
                <X size={16} weight="duotone" aria-hidden="true" />
              </div>
            </FloatingField>
            <FloatingField label="Email">
              <input type="email" value={account.email} readOnly />
            </FloatingField>
            <FloatingField label="Quê quán">
              <input type="text" placeholder="Quê quán" readOnly />
            </FloatingField>
            <FloatingField label="Điện thoại">
              <input type="text" value={stablePhone(account)} readOnly />
            </FloatingField>
            <FloatingField label="Ngày sinh">
              <div className="admin-user-edit-static-select">
                <span>--</span>
                <CalendarBlank size={16} weight="duotone" aria-hidden="true" />
              </div>
            </FloatingField>
            <FloatingField label="Vai trò người dùng" wide>
              <FormSelect
                ariaLabel="Chọn vai trò người dùng"
                defaultValue="user"
                menuLabel="Vai trò người dùng"
                options={roleOptions}
                placeholder="Vai trò người dùng"
                disabled
              />
            </FloatingField>
          </div>

          <div className="admin-user-edit-check">
            <FormCheckbox
              checked={isPasswordChangeEnabled}
              onChange={(event) => setIsPasswordChangeEnabled(event.currentTarget.checked)}
              label="Thay đổi mật khẩu"
            />
          </div>

          <div className="admin-user-edit-grid">
            <FloatingField label="Mật khẩu" required>
              <div className="admin-user-edit-password">
                <input
                  name="initialPassword"
                  type="password"
                  placeholder="Mật khẩu"
                  autoComplete="new-password"
                  disabled={!isPasswordChangeEnabled}
                  required={isPasswordChangeEnabled}
                />
                <Eye size={16} weight="duotone" aria-hidden="true" />
              </div>
            </FloatingField>
            <FloatingField label="Xác nhận lại mật khẩu" required>
              <div className="admin-user-edit-password">
                <input
                  type="password"
                  placeholder="Xác nhận lại mật khẩu"
                  autoComplete="new-password"
                  disabled={!isPasswordChangeEnabled}
                  required={isPasswordChangeEnabled}
                />
                <Eye size={16} weight="duotone" aria-hidden="true" />
              </div>
            </FloatingField>
            <FloatingField label="Nhóm người dùng" required wide>
              <FormSelect
                ariaLabel="Chọn nhóm người dùng"
                defaultValue={selectedGroupId}
                menuLabel="Nhóm người dùng"
                name="permissionGroupId"
                options={assignableGroups.map((group) => ({ value: group.id, label: group.name }))}
                placeholder="Chọn nhóm người dùng"
                required
                onValueChange={(value) => {
                  setSelectedGroupId(value);

                  if (!isCustomPermission) {
                    setSelectedPermissionKeys(new Set(groupPermissions(value, data.groups)));
                  }
                }}
              />
            </FloatingField>
          </div>

          <div className="admin-user-edit-check">
            <FormCheckbox
              checked={isCustomPermission}
              onChange={(event) => toggleCustomPermission(event.currentTarget.checked)}
              label="Tùy chỉnh quyền"
            />
          </div>

          <FloatingField label="Trạng thái">
            <FormSelect
              ariaLabel="Chọn trạng thái tài khoản"
              defaultValue={account.status}
              menuLabel="Trạng thái tài khoản"
              name="accountStatus"
              options={statusOptions}
              placeholder="Trạng thái"
            />
          </FloatingField>
          </div>
          ) : null}
        </section>

        <section className="admin-user-edit-section admin-user-edit-permissions" aria-labelledby="admin-user-edit-permission-title">
          <header>
            <h2 id="admin-user-edit-permission-title">
              <button
                className={isSectionCollapsed("permissions") ? "admin-user-edit-section-toggle is-collapsed" : "admin-user-edit-section-toggle"}
                type="button"
                aria-controls="admin-user-edit-permission-body"
                aria-expanded={!isSectionCollapsed("permissions")}
                onClick={() => toggleSection("permissions")}
              >
                <CaretDown size={18} weight="duotone" aria-hidden="true" />
                <span>Phân quyền</span>
              </button>
            </h2>
          </header>

          {!isSectionCollapsed("permissions") ? (
          <div className="admin-user-edit-section-body" id="admin-user-edit-permission-body">
          <div className="admin-user-edit-permission-shell" tabIndex={0} aria-label="Bảng phân quyền có thể cuộn ngang">
            <table className="admin-user-edit-permission-table">
              <thead>
                <tr>
                  <th scope="col">Đối tượng</th>
                  <th scope="col">Quản lý</th>
                  <th scope="col">Xem</th>
                  <th scope="col">Tạo mới</th>
                </tr>
              </thead>
              <tbody>
                {groupedPermissions.map((group) => {
                  const groupPermissionKeys = group.items.map((permission) => permission.key);
                  const checkedCount = groupPermissionKeys.filter((permissionKey) => selectedPermissionKeys.has(permissionKey)).length;
                  const isGroupChecked = checkedCount > 0;

                  return (
                    <Fragment key={group.category}>
                      <tr className="is-category">
                        <th scope="row">
                          <FormCheckbox
                            checked={isGroupChecked}
                            disabled={!isCustomPermission}
                            onChange={(event) => setCategoryChecked(groupPermissionKeys, event.currentTarget.checked)}
                            label={<strong>{group.category}</strong>}
                          />
                        </th>
                        <td>--</td>
                        <td>--</td>
                        <td>--</td>
                      </tr>
                      {group.items.map((permission) => {
                        const isChecked = selectedPermissionKeys.has(permission.key);

                        return (
                          <tr key={permission.key}>
                            <th scope="row">
                              <FormCheckbox
                                checked={isChecked}
                                disabled={!isCustomPermission}
                                name={isCustomPermission ? "customPermissionKeys" : undefined}
                                value={permission.key}
                                onChange={(event) => setPermissionChecked(permission.key, event.currentTarget.checked)}
                                label={permission.label}
                              />
                            </th>
                            <td><PermissionActionControl disabled={!isChecked || !isCustomPermission} label={isChecked ? permissionActionText(permission, "manage") : "Không có"} /></td>
                            <td><PermissionActionControl disabled={!isChecked || !isCustomPermission} label={isChecked ? permissionActionText(permission, "view") : "Không có"} /></td>
                            <td><PermissionActionControl disabled={!isChecked || !isCustomPermission} label={isChecked ? permissionActionText(permission, "create") : "Không có"} /></td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
          ) : null}
        </section>

        {state.error ? <p className="admin-user-edit-error">{state.error}</p> : null}

        <footer className="admin-user-edit-actions">
          <button className="primary-button" type="submit" disabled={isPending}>
            <CheckCircle size={16} weight="duotone" aria-hidden="true" />
            {isPending ? "Đang cập nhật" : "Cập nhật"}
          </button>
          <button className="secondary-button" type="button" onClick={() => router.push(`/admin/settings/accounts/${encodeURIComponent(account.id)}`)}>
            <X size={16} weight="duotone" aria-hidden="true" />
            Hủy bỏ
          </button>
        </footer>
      </form>
    </main>
  );
}
