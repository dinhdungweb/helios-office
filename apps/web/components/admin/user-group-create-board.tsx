"use client";

import { Fragment, useActionState, useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormCheckbox, FormSelect, type FormSelectOption } from "@/components/ui/form-controls";
import {
  createPermissionGroupAction,
  updatePermissionGroupAction,
  type GroupFormState
} from "@/lib/account-access-actions";
import type { AccountAccessData, PermissionGroup } from "@/lib/account-access-api";
import { CaretDown } from "@/lib/icons";
import {
  filterGroupPermissionSectionsByCatalog,
  getGroupPermissionActionKeys,
  getGroupPermissionBaseKeys,
  groupPermissionFormSections,
  groupSystemPermissionKeys,
  hasGroupPermissionAction,
  hasGroupSystemPermissions,
  type GroupPermissionActionColumn,
  type GroupPermissionItem,
  type GroupPermissionSection
} from "@/lib/user-group-permission-model";

const initialState: GroupFormState = { ok: false };

type GroupCreateSectionKey = "info" | "permissions";

const noPermissionOption: FormSelectOption = { label: "Không có", value: "none" };

const permissionActionOptions: Record<GroupPermissionActionColumn, FormSelectOption[]> = {
  manage: [
    noPermissionOption,
    { label: "Quản lý tất cả", value: "manage_all" },
    { label: "Quản lý công ty", value: "manage_company" },
    { label: "Quản lý chi nhánh", value: "manage_branch" },
    { label: "Quản lý phòng ban", value: "manage_department" }
  ],
  view: [
    noPermissionOption,
    { label: "Xem tất cả", value: "view_all" },
    { label: "Xem công ty", value: "view_company" },
    { label: "Xem chi nhánh", value: "view_branch" },
    { label: "Xem phòng ban", value: "view_department" }
  ],
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
  manage: "manage_all",
  view: "view_all",
  create: "create"
};

function PermissionActionSelect({
  column,
  defaultValue,
  disabled,
  onValueChange,
  permissionKey
}: {
  column: GroupPermissionActionColumn;
  defaultValue?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
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
      options={permissionActionOptions[column]}
      placeholder="Chọn quyền"
    />
  );
}

function groupDetailHref(groupId: string) {
  return `/admin/settings/accounts/groups/${encodeURIComponent(groupId)}`;
}

export function UserGroupCreateBoard({ data, group }: { data: AccountAccessData; group?: PermissionGroup }) {
  const router = useRouter();
  const isEditing = Boolean(group);
  const action = group ? updatePermissionGroupAction : createPermissionGroupAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [groupName, setGroupName] = useState(group?.name ?? "");
  const [isSystemPermissionsEnabled, setIsSystemPermissionsEnabled] = useState(() =>
    group ? hasGroupSystemPermissions(group.permissionKeys) : false
  );
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<Set<string>>(() => new Set(group?.permissionKeys ?? []));
  const [collapsedSections, setCollapsedSections] = useState<Set<GroupCreateSectionKey>>(() => new Set());
  const permissionSections = useMemo(
    () => filterGroupPermissionSectionsByCatalog(groupPermissionFormSections, data.permissions),
    [data.permissions]
  );
  const knownPermissionKeys = useMemo(() => new Set(data.permissions.map((permission) => permission.key)), [data.permissions]);
  const visiblePermissionKeys = useMemo(
    () => new Set(permissionSections.flatMap((section) => section.items.flatMap((item) => item.permissionKeys))),
    [permissionSections]
  );
  const knownSystemPermissionKeys = useMemo(() => {
    if (knownPermissionKeys.size === 0) {
      return groupSystemPermissionKeys;
    }

    return groupSystemPermissionKeys.filter((permissionKey) => knownPermissionKeys.has(permissionKey));
  }, [knownPermissionKeys]);
  const selectedPermissionKeysToSubmit = useMemo(() => {
    const selectedKeys = new Set(Array.from(selectedPermissionKeys).filter((permissionKey) => visiblePermissionKeys.has(permissionKey)));

    if (isSystemPermissionsEnabled) {
      knownSystemPermissionKeys.forEach((permissionKey) => selectedKeys.add(permissionKey));
    }

    if (knownPermissionKeys.size === 0) {
      return Array.from(selectedKeys);
    }

    return Array.from(selectedKeys).filter((permissionKey) => knownPermissionKeys.has(permissionKey));
  }, [isSystemPermissionsEnabled, knownPermissionKeys, knownSystemPermissionKeys, selectedPermissionKeys, visiblePermissionKeys]);

  useEffect(() => {
    if (state.ok) {
      router.push(group ? (groupDetailHref(group.id) as Route) : "/admin/settings/accounts/groups");
    }
  }, [group, router, state.ok]);

  function togglePermissionKeys(permissionKeys: string[], checked: boolean) {
    setSelectedPermissionKeys((current) => {
      const next = new Set(current);

      if (checked) {
        permissionKeys.forEach((permissionKey) => next.add(permissionKey));
      } else {
        permissionKeys.forEach((permissionKey) => next.delete(permissionKey));
      }

      return next;
    });
  }

  function getPermissionItemSelectionKeys(item: GroupPermissionItem) {
    const baseKeys = getGroupPermissionBaseKeys(item);

    return baseKeys.length > 0 ? baseKeys : item.permissionKeys;
  }

  function togglePermissionItem(item: GroupPermissionItem, checked: boolean) {
    togglePermissionKeys(checked ? getPermissionItemSelectionKeys(item) : item.permissionKeys, checked);
  }

  function isPermissionItemSelected(item: GroupPermissionItem) {
    return item.permissionKeys.some((permissionKey) => selectedPermissionKeys.has(permissionKey));
  }

  function isPermissionSectionSelected(section: GroupPermissionSection) {
    return section.items.every((item) => isPermissionItemSelected(item));
  }

  function toggleCategory(section: GroupPermissionSection, checked: boolean) {
    togglePermissionKeys(
      section.items.flatMap((item) => (checked ? getPermissionItemSelectionKeys(item) : item.permissionKeys)),
      checked
    );
  }

  function permissionActionValue(item: GroupPermissionItem, column: GroupPermissionActionColumn) {
    return hasGroupPermissionAction(item, selectedPermissionKeys, column) ? permissionActionDefaultValues[column] : "";
  }

  function setPermissionAction(item: GroupPermissionItem, column: GroupPermissionActionColumn, value: string) {
    const actionKeys = getGroupPermissionActionKeys(item, column);

    setSelectedPermissionKeys((current) => {
      const next = new Set(current);

      actionKeys.forEach((permissionKey) => next.delete(permissionKey));

      if (value !== "none" && value !== "no_create" && value.length > 0 && actionKeys.length > 0) {
        getPermissionItemSelectionKeys(item).forEach((permissionKey) => next.add(permissionKey));
        actionKeys.forEach((permissionKey) => next.add(permissionKey));
      }

      return next;
    });
  }

  function isSectionCollapsed(section: GroupCreateSectionKey) {
    return collapsedSections.has(section);
  }

  function toggleSection(section: GroupCreateSectionKey) {
    setCollapsedSections((current) => {
      const next = new Set(current);

      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }

      return next;
    });
  }

  const isInfoCollapsed = isSectionCollapsed("info");
  const isPermissionsCollapsed = isSectionCollapsed("permissions");

  return (
    <main className="group-create-page" aria-label={isEditing ? `Sửa nhóm ${group?.name}` : "Tạo mới nhóm"}>
      <form action={formAction} className="group-create-form">
        {group ? <input name="groupId" type="hidden" value={group.id} /> : null}
        <input name="description" type="hidden" value={groupName || group?.summary || "Nhóm người dùng"} />
        <input name="roleScope" type="hidden" value="user" />
        {selectedPermissionKeysToSubmit.map((permissionKey) => (
          <input key={permissionKey} name="permissionKeys" type="hidden" value={permissionKey} />
        ))}

        <section className={isInfoCollapsed ? "group-create-section is-collapsed" : "group-create-section"} aria-labelledby="group-create-info-title">
          <header className="group-create-section-header">
            <h2 id="group-create-info-title">
              <button
                className="group-create-section-toggle"
                type="button"
                aria-controls="group-create-info-body"
                aria-expanded={!isInfoCollapsed}
                onClick={() => toggleSection("info")}
              >
                <CaretDown size={16} weight="duotone" aria-hidden="true" />
                <span>Thông tin nhóm</span>
              </button>
            </h2>
          </header>
          <div className="group-create-info-row" id="group-create-info-body" hidden={isInfoCollapsed}>
            <label className="group-create-name-field">
              <span className="sr-only">Tên nhóm</span>
              <input
                name="name"
                required
                minLength={2}
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Tên nhóm *"
                autoComplete="off"
              />
            </label>
            <FormCheckbox
              checked={isSystemPermissionsEnabled}
              label="Cho phép quản trị hệ thống"
              onChange={(event) => setIsSystemPermissionsEnabled(event.currentTarget.checked)}
            />
            <FormCheckbox label="Nhóm mặc định" name="isDefaultGroup" />
          </div>
        </section>

        <section
          className={isPermissionsCollapsed ? "group-create-section group-create-permissions is-collapsed" : "group-create-section group-create-permissions"}
          aria-labelledby="group-create-permission-title"
        >
          <header className="group-create-section-header">
            <h2 id="group-create-permission-title">
              <button
                className="group-create-section-toggle"
                type="button"
                aria-controls="group-create-permission-body"
                aria-expanded={!isPermissionsCollapsed}
                onClick={() => toggleSection("permissions")}
              >
                <CaretDown size={16} weight="duotone" aria-hidden="true" />
                <span>Phân quyền</span>
              </button>
            </h2>
          </header>

          <div
            className="admin-user-edit-permission-shell group-create-permission-shell"
            id="group-create-permission-body"
            tabIndex={0}
            aria-label="Bảng phân quyền nhóm có thể cuộn ngang"
            hidden={isPermissionsCollapsed}
          >
            <table className="admin-user-edit-permission-table group-create-permission-table">
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
                    <tr className="is-category" key={`${section.category}-category`}>
                      <th scope="row">
                        <FormCheckbox
                          checked={isPermissionSectionSelected(section)}
                          label={section.category}
                          onChange={(event) => toggleCategory(section, event.currentTarget.checked)}
                        />
                      </th>
                      <td>--</td>
                      <td>--</td>
                      <td>--</td>
                    </tr>
                    {section.items.map((permission) => {
                      const isChecked = isPermissionItemSelected(permission);

                      return (
                        <tr key={permission.id}>
                          <th scope="row">
                            <FormCheckbox
                              checked={isChecked}
                              label={permission.label}
                              onChange={(event) => togglePermissionItem(permission, event.currentTarget.checked)}
                            />
                          </th>
                          <td>
                            <PermissionActionSelect
                              column="manage"
                              defaultValue={permissionActionValue(permission, "manage")}
                              disabled={!isChecked || getGroupPermissionActionKeys(permission, "manage").length === 0}
                              key={`${permission.id}-manage-${permissionActionValue(permission, "manage")}-${isChecked ? "on" : "off"}`}
                              onValueChange={(value) => setPermissionAction(permission, "manage", value)}
                              permissionKey={permission.id}
                            />
                          </td>
                          <td>
                            <PermissionActionSelect
                              column="view"
                              defaultValue={permissionActionValue(permission, "view")}
                              disabled={!isChecked || getGroupPermissionActionKeys(permission, "view").length === 0}
                              key={`${permission.id}-view-${permissionActionValue(permission, "view")}-${isChecked ? "on" : "off"}`}
                              onValueChange={(value) => setPermissionAction(permission, "view", value)}
                              permissionKey={permission.id}
                            />
                          </td>
                          <td>
                            <PermissionActionSelect
                              column="create"
                              defaultValue={permissionActionValue(permission, "create")}
                              disabled={!isChecked || getGroupPermissionActionKeys(permission, "create").length === 0}
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
        </section>

        {state.error ? <p className="account-dialog-error group-create-error">{state.error}</p> : null}

        <footer className="group-create-footer">
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "ĐANG XỬ LÝ" : "CẬP NHẬT"}
          </button>
          <a className="secondary-button" href={group ? groupDetailHref(group.id) : "/admin/settings/accounts/groups"}>
            HỦY BỎ
          </a>
        </footer>
      </form>
    </main>
  );
}
