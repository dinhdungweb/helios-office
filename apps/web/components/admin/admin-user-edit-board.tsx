"use client";

import { Fragment, useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FormCheckbox, FormSelect, type FormSelectOption } from "@/components/ui/form-controls";
import { updateAccountAction, type AccountFormState } from "@/lib/account-access-actions";
import { CalendarBlank, CaretDown, CheckCircle, Eye, X } from "@/lib/icons";
import type {
  AccountAccessData,
  AccountLifecycleStatus,
  AccountPermission,
  AccountPermissionOverrides,
  ManagedUserAccount,
  PermissionGroup,
  PermissionOverride
} from "@/lib/account-access-api";
import type { DataScopeLevel } from "@/lib/data-scope";
import {
  defaultGrantScope,
  noPermissionOption,
  scopeFromActionValue,
  scopedOptions,
  type ScopedPermissionColumn
} from "@/lib/permission-scope-options";
import {
  filterGroupPermissionSectionsByCatalog,
  getGroupPermissionActionKeys,
  getGroupPermissionBaseKeys,
  groupPermissionFormSections,
  hasGroupPermissionAction,
  type GroupPermissionActionColumn,
  type GroupPermissionItem,
  type GroupPermissionSection
} from "@/lib/user-group-permission-model";

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

// Non-scopable permissions are simply on or off; scopable ones use scopedOptions() (AU-11).
const permissionActionOptions: Record<GroupPermissionActionColumn, FormSelectOption[]> = {
  manage: [noPermissionOption, { label: "Được quản lý", value: "manage_company" }],
  view: [noPermissionOption, { label: "Được xem", value: "view_company" }],
  create: [
    noPermissionOption,
    { label: "Tạo mới", value: "create" },
    { label: "Không tạo mới", value: "no_create" }
  ]
};

const permissionActionMenuLabels: Record<GroupPermissionActionColumn, string> = {
  manage: "Quyền quản lý",
  view: "Quyền xem",
  create: "Quyền tạo mới"
};

const permissionActionDefaultValues: Record<GroupPermissionActionColumn, string> = {
  manage: "manage_company",
  view: "view_company",
  create: "create"
};

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

function selectedPermissionItemIdsFromKeys(sections: GroupPermissionSection[], permissionKeys: Iterable<string>) {
  const permissionKeySet = new Set(permissionKeys);

  return new Set(
    sections
      .flatMap((section) => section.items)
      .filter((item) => item.permissionKeys.some((permissionKey) => permissionKeySet.has(permissionKey)))
      .map((item) => item.id)
  );
}

function isEditableAccountPermission(permission: AccountPermission) {
  return !permission.adminOnly && !permission.key.startsWith("system.");
}

function editablePermissionKeys(permissionKeys: string[], permissionSections: GroupPermissionSection[]) {
  const editableKeys = new Set(permissionSections.flatMap((section) => section.items.flatMap((item) => item.permissionKeys)));

  return permissionKeys.filter((permissionKey) => editableKeys.has(permissionKey));
}

function groupPermissionsByCategory(permissions: AccountPermission[]) {
  return permissions.filter(isEditableAccountPermission).reduce<Array<{ category: string; items: AccountPermission[] }>>((groups, permission) => {
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

function PermissionActionSelect({
  column,
  defaultValue,
  disabled,
  onValueChange,
  options,
  permissionKey
}: {
  column: GroupPermissionActionColumn;
  defaultValue?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  options: FormSelectOption[];
  permissionKey: string;
}) {
  return (
    <FormSelect
      ariaLabel={permissionActionMenuLabels[column]}
      className="group-create-permission-select"
      defaultValue={defaultValue}
      disabled={disabled}
      menuLabel={permissionActionMenuLabels[column]}
      name={`permissionAction.${permissionKey}.${column}`}
      onValueChange={onValueChange}
      options={options}
      placeholder="Chọn quyền"
    />
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
  data,
  overrides
}: {
  account: ManagedUserAccount;
  data: AccountAccessData;
  overrides: AccountPermissionOverrides;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateAccountAction, initialState);
  const assignableGroups = useMemo(
    () => data.groups.filter((group) => group.status !== "archived" || group.id === account.groupId),
    [account.groupId, data.groups]
  );
  const permissionSections = useMemo(
    () => filterGroupPermissionSectionsByCatalog(groupPermissionFormSections, data.permissions),
    [data.permissions]
  );
  const visiblePermissionKeys = useMemo(
    () => new Set(permissionSections.flatMap((section) => section.items.flatMap((item) => item.permissionKeys))),
    [permissionSections]
  );
  const initialGroupId = account.groupId ?? assignableGroups[0]?.id ?? "";
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [isPasswordChangeEnabled, setIsPasswordChangeEnabled] = useState(false);
  const [isCustomPermission, setIsCustomPermission] = useState(overrides.enabled);
  const scopablePermissionKeys = useMemo(
    () => new Set(data.permissions.filter((permission) => permission.scopable).map((permission) => permission.key)),
    [data.permissions]
  );
  const savedOverrideScopes = useMemo(
    () => Object.fromEntries(overrides.overrides.flatMap((override) => (override.mode === "grant" && override.scope ? [[override.key, override.scope]] : []))),
    [overrides.overrides]
  ) as Record<string, DataScopeLevel>;
  const selectedGroup = data.groups.find((group) => group.id === selectedGroupId);
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<Set<string>>(
    () => new Set(editablePermissionKeys(account.effectivePermissionKeys.length > 0 ? account.effectivePermissionKeys : groupPermissions(initialGroupId, data.groups), permissionSections))
  );
  const [selectedPermissionItemIds, setSelectedPermissionItemIds] = useState<Set<string>>(() =>
    selectedPermissionItemIdsFromKeys(
      permissionSections,
      editablePermissionKeys(account.effectivePermissionKeys.length > 0 ? account.effectivePermissionKeys : groupPermissions(initialGroupId, data.groups), permissionSections)
    )
  );
  const [permissionActionOverrides, setPermissionActionOverrides] = useState<Record<string, string>>({});
  const [collapsedSections, setCollapsedSections] = useState<Set<EditSectionKey>>(() => new Set());

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

  const getPermissionItemSelectionKeys = (item: GroupPermissionItem) => {
    return getGroupPermissionBaseKeys(item);
  };

  const setPermissionItemChecked = (item: GroupPermissionItem, checked: boolean) => {
    if (!checked) {
      setPermissionActionOverrides((current) => {
        const next = { ...current };

        delete next[`${item.id}.manage`];
        delete next[`${item.id}.view`];
        delete next[`${item.id}.create`];

        return next;
      });
    }

    setSelectedPermissionItemIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(item.id);
      } else {
        next.delete(item.id);
      }

      return next;
    });
    setCategoryChecked(checked ? getPermissionItemSelectionKeys(item) : item.permissionKeys, checked);
  };

  const isPermissionItemChecked = (item: GroupPermissionItem) =>
    selectedPermissionItemIds.has(item.id);

  const isPermissionSectionChecked = (section: GroupPermissionSection) =>
    section.items.every((item) => isPermissionItemChecked(item));

  const setPermissionSectionChecked = (section: GroupPermissionSection, checked: boolean) => {
    if (!checked) {
      setPermissionActionOverrides((current) => {
        const next = { ...current };

        section.items.forEach((item) => {
          delete next[`${item.id}.manage`];
          delete next[`${item.id}.view`];
          delete next[`${item.id}.create`];
        });

        return next;
      });
    }

    setSelectedPermissionItemIds((current) => {
      const next = new Set(current);

      section.items.forEach((item) => {
        if (checked) {
          next.add(item.id);
        } else {
          next.delete(item.id);
        }
      });

      return next;
    });
    setCategoryChecked(
      section.items.flatMap((item) => (checked ? getPermissionItemSelectionKeys(item) : item.permissionKeys)),
      checked
    );
  };

  const permissionActionValue = (item: GroupPermissionItem, column: GroupPermissionActionColumn) => {
    const overrideKey = `${item.id}.${column}`;

    if (permissionActionOverrides[overrideKey] !== undefined) {
      return permissionActionOverrides[overrideKey];
    }

    if (!hasGroupPermissionAction(item, selectedPermissionKeys, column)) {
      return "";
    }

    if (!isScopedColumn(item, column)) {
      return permissionActionDefaultValues[column];
    }

    // The scope this account gets today: its own override, else the selected group's.
    const scope = getGroupPermissionActionKeys(item, column)
      .map((permissionKey) => savedOverrideScopes[permissionKey] ?? selectedGroup?.permissionScopes[permissionKey])
      .find(Boolean);

    return `${column}_${scope ?? defaultGrantScope}`;
  };

  function isScopedColumn(item: GroupPermissionItem, column: GroupPermissionActionColumn): column is ScopedPermissionColumn {
    return column !== "create" && getGroupPermissionActionKeys(item, column).some((permissionKey) => scopablePermissionKeys.has(permissionKey));
  }

  const permissionActionOptionsFor = (item: GroupPermissionItem, column: GroupPermissionActionColumn) =>
    isScopedColumn(item, column) ? scopedOptions(column) : permissionActionOptions[column];

  // AU-11: what differs from the selected group, sent to PUT /permission-overrides. Unchecked group
  // keys become revokes, extra keys grants, and a scope different from the group's a re-scoped grant.
  // Overrides of keys this matrix does not show are kept as they are.
  const permissionOverridesToSubmit = (): PermissionOverride[] => {
    if (!isCustomPermission) return [];

    const groupKeys = new Set(selectedGroup?.permissionKeys ?? []);
    const desiredScopes: Record<string, DataScopeLevel> = {};
    for (const item of permissionSections.flatMap((section) => section.items)) {
      for (const column of ["manage", "view"] as const) {
        if (!isScopedColumn(item, column)) continue;
        const scope = scopeFromActionValue(column, permissionActionValue(item, column));
        if (!scope) continue;
        getGroupPermissionActionKeys(item, column)
          .filter((permissionKey) => scopablePermissionKeys.has(permissionKey))
          .forEach((permissionKey) => {
            desiredScopes[permissionKey] = scope;
          });
      }
    }

    const result: PermissionOverride[] = [];
    for (const key of visiblePermissionKeys) {
      const selected = selectedPermissionKeys.has(key);
      const inGroup = groupKeys.has(key);
      const scope = scopablePermissionKeys.has(key) ? desiredScopes[key] : undefined;
      const groupScope = selectedGroup?.permissionScopes[key] ?? defaultGrantScope;

      if (selected && !inGroup) {
        result.push(scope ? { key, mode: "grant", scope } : { key, mode: "grant" });
      } else if (!selected && inGroup) {
        result.push({ key, mode: "revoke" });
      } else if (selected && inGroup && scope && scope !== groupScope) {
        result.push({ key, mode: "grant", scope });
      }
    }

    return [...result, ...overrides.overrides.filter((override) => !visiblePermissionKeys.has(override.key))];
  };

  const hasPermissionActionColumn = (item: GroupPermissionItem, column: GroupPermissionActionColumn) =>
    getGroupPermissionActionKeys(item, column).length > 0 || Boolean(item[column]);

  const setPermissionAction = (item: GroupPermissionItem, column: GroupPermissionActionColumn, value: string) => {
    const actionKeys = getGroupPermissionActionKeys(item, column);
    const nextValue = value !== "none" && value !== "no_create" ? value : "";

    if (nextValue) {
      setSelectedPermissionItemIds((current) => new Set(current).add(item.id));
    }

    setPermissionActionOverrides((current) => ({
      ...current,
      [`${item.id}.${column}`]: nextValue
    }));

    setSelectedPermissionKeys((current) => {
      const next = new Set(current);

      actionKeys.forEach((permissionKey) => next.delete(permissionKey));

      if (value !== "none" && value !== "no_create" && value.length > 0) {
        getPermissionItemSelectionKeys(item).forEach((permissionKey) => next.add(permissionKey));
        actionKeys.forEach((permissionKey) => next.add(permissionKey));
      }

      return next;
    });
  };

  const toggleCustomPermission = (checked: boolean) => {
    setIsCustomPermission(checked);

    if (checked && selectedPermissionKeys.size === 0) {
      const nextPermissionKeys = editablePermissionKeys(groupPermissions(selectedGroupId, data.groups), permissionSections);

      setSelectedPermissionKeys(new Set(nextPermissionKeys));
      setSelectedPermissionItemIds(selectedPermissionItemIdsFromKeys(permissionSections, nextPermissionKeys));
    }
  };

  return (
    <main className="admin-user-edit-page" aria-label={`Sửa tài khoản ${account.name}`}>
      <form className="admin-user-edit-form" action={formAction}>
        <input name="accountId" type="hidden" value={account.id} />
        <input name="email" type="hidden" value={account.email} />
        <input name="displayName" type="hidden" value={account.name} />
        <input name="adminRole" type="hidden" value={account.role} />
        <input name="customPermissionNote" type="hidden" value={overrides.note ?? ""} />
        <input name="customPermissionsEnabled" type="hidden" value={isCustomPermission ? "on" : ""} />
        <input name="permissionOverrides" type="hidden" value={JSON.stringify(permissionOverridesToSubmit())} />

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
                    const nextPermissionKeys = editablePermissionKeys(groupPermissions(value, data.groups), permissionSections);

                    setSelectedPermissionKeys(new Set(nextPermissionKeys));
                    setSelectedPermissionItemIds(selectedPermissionItemIdsFromKeys(permissionSections, nextPermissionKeys));
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
                {permissionSections.map((section) => (
                  <Fragment key={section.category}>
                    <tr className="is-category">
                      <th scope="row">
                        <FormCheckbox
                          checked={isPermissionSectionChecked(section)}
                          disabled={!isCustomPermission}
                          onChange={(event) => setPermissionSectionChecked(section, event.currentTarget.checked)}
                          label={<strong>{section.category}</strong>}
                        />
                      </th>
                      <td>--</td>
                      <td>--</td>
                      <td>--</td>
                    </tr>
                    {section.items.map((permission) => {
                      const isChecked = isPermissionItemChecked(permission);

                      return (
                        <tr key={permission.id}>
                          <th scope="row">
                            <FormCheckbox
                              checked={isChecked}
                              disabled={!isCustomPermission}
                              onChange={(event) => setPermissionItemChecked(permission, event.currentTarget.checked)}
                              label={permission.label}
                            />
                          </th>
                          <td>
                            <PermissionActionSelect
                              column="manage"
                              options={permissionActionOptionsFor(permission, "manage")}
                              defaultValue={permissionActionValue(permission, "manage")}
                              disabled={!isChecked || !isCustomPermission}
                              key={`${permission.id}-manage-${permissionActionValue(permission, "manage")}-${isChecked ? "on" : "off"}`}
                              onValueChange={(value) => setPermissionAction(permission, "manage", value)}
                              permissionKey={permission.id}
                            />
                          </td>
                          <td>
                            <PermissionActionSelect
                              column="view"
                              options={permissionActionOptionsFor(permission, "view")}
                              defaultValue={permissionActionValue(permission, "view")}
                              disabled={!isChecked || !isCustomPermission}
                              key={`${permission.id}-view-${permissionActionValue(permission, "view")}-${isChecked ? "on" : "off"}`}
                              onValueChange={(value) => setPermissionAction(permission, "view", value)}
                              permissionKey={permission.id}
                            />
                          </td>
                          <td>
                            <PermissionActionSelect
                              column="create"
                              options={permissionActionOptionsFor(permission, "create")}
                              defaultValue={permissionActionValue(permission, "create")}
                              disabled={!isChecked || !isCustomPermission}
                              key={`${permission.id}-create-${permissionActionValue(permission, "create")}-${isChecked ? "on" : "off"}`}
                              onValueChange={(value) => setPermissionAction(permission, "create", value)}
                              permissionKey={permission.id}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
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
