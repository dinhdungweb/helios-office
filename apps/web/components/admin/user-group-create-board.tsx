"use client";

import { Fragment, useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormCheckbox, FormSelect, type FormSelectOption } from "@/components/ui/form-controls";
import { createPermissionGroupAction, type GroupFormState } from "@/lib/account-access-actions";
import type { AccountAccessData, AccountPermission, AccountRole } from "@/lib/account-access-api";
import { CaretDown } from "@/lib/icons";

const initialState: GroupFormState = { ok: false };

type PermissionActionColumn = "manage" | "view" | "create";

const permissionActionOptions: Record<PermissionActionColumn, FormSelectOption[]> = {
  manage: [
    { label: "Quản lý tất cả", value: "manage_all" },
    { label: "Quản lý công ty", value: "manage_company" },
    { label: "Quản lý chi nhánh", value: "manage_branch" },
    { label: "Quản lý phòng ban", value: "manage_department" }
  ],
  view: [
    { label: "Xem tất cả", value: "view_all" },
    { label: "Xem công ty", value: "view_company" },
    { label: "Xem chi nhánh", value: "view_branch" },
    { label: "Xem phòng ban", value: "view_department" }
  ],
  create: [
    { label: "Tạo mới", value: "create" },
    { label: "Không tạo mới", value: "no_create" }
  ]
};

const permissionActionMenuLabels: Record<PermissionActionColumn, string> = {
  manage: "Quyền quản lý",
  view: "Quyền xem",
  create: "Quyền tạo mới"
};

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

function PermissionActionSelect({
  column,
  disabled,
  permissionKey
}: {
  column: PermissionActionColumn;
  disabled?: boolean;
  permissionKey: string;
}) {
  return (
    <FormSelect
      ariaLabel={permissionActionMenuLabels[column]}
      className="group-create-permission-select"
      disabled={disabled}
      menuLabel={permissionActionMenuLabels[column]}
      name={`permissionAction.${permissionKey}.${column}`}
      options={permissionActionOptions[column]}
      placeholder="Chọn quyền"
    />
  );
}

export function UserGroupCreateBoard({ data }: { data: AccountAccessData }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createPermissionGroupAction, initialState);
  const [groupName, setGroupName] = useState("");
  const [roleScope, setRoleScope] = useState<AccountRole>("user");
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<Set<string>>(() => new Set());
  const groupedPermissions = useMemo(() => groupPermissionsByCategory(data.permissions), [data.permissions]);

  useEffect(() => {
    if (state.ok) {
      router.push("/admin/settings/accounts/groups");
    }
  }, [router, state.ok]);

  function togglePermission(permissionKey: string, checked: boolean) {
    setSelectedPermissionKeys((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(permissionKey);
      } else {
        next.delete(permissionKey);
      }

      return next;
    });
  }

  function toggleCategory(permissions: AccountPermission[], checked: boolean) {
    setSelectedPermissionKeys((current) => {
      const next = new Set(current);

      permissions.forEach((permission) => {
        if (checked) {
          next.add(permission.key);
        } else {
          next.delete(permission.key);
        }
      });

      return next;
    });
  }

  return (
    <main className="group-create-page" aria-label="Tạo mới nhóm">
      <form action={formAction} className="group-create-form">
        <input name="description" type="hidden" value={groupName || "Nhóm người dùng"} />
        <input name="roleScope" type="hidden" value={roleScope} />

        <section className="group-create-section" aria-labelledby="group-create-info-title">
          <header className="group-create-section-header">
            <CaretDown size={16} weight="duotone" aria-hidden="true" />
            <h2 id="group-create-info-title">Thông tin nhóm</h2>
          </header>
          <div className="group-create-info-row">
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
              checked={roleScope === "system_admin"}
              label="Cho phép quản trị hệ thống"
              onChange={(event) => setRoleScope(event.currentTarget.checked ? "system_admin" : "user")}
            />
            <FormCheckbox label="Nhóm mặc định" name="isDefaultGroup" />
          </div>
        </section>

        <section className="group-create-section group-create-permissions" aria-labelledby="group-create-permission-title">
          <header className="group-create-section-header">
            <CaretDown size={16} weight="duotone" aria-hidden="true" />
            <h2 id="group-create-permission-title">Phân quyền</h2>
          </header>

          <div className="admin-user-edit-permission-shell group-create-permission-shell" tabIndex={0} aria-label="Bảng phân quyền nhóm có thể cuộn ngang">
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
                {groupedPermissions.map((group) => (
                  <Fragment key={group.category}>
                    <tr className="is-category" key={`${group.category}-category`}>
                      <th scope="row">
                        <FormCheckbox
                          checked={group.items.every((permission) => selectedPermissionKeys.has(permission.key))}
                          label={group.category.toUpperCase()}
                          onChange={(event) => toggleCategory(group.items, event.currentTarget.checked)}
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
                              name="permissionKeys"
                              value={permission.key}
                              label={permission.label}
                              onChange={(event) => togglePermission(permission.key, event.currentTarget.checked)}
                            />
                          </th>
                          <td><PermissionActionSelect column="manage" disabled={!isChecked} permissionKey={permission.key} /></td>
                          <td><PermissionActionSelect column="view" disabled={!isChecked} permissionKey={permission.key} /></td>
                          <td><PermissionActionSelect column="create" disabled={!isChecked} permissionKey={permission.key} /></td>
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
          <a className="secondary-button" href="/admin/settings/accounts/groups">
            HỦY BỎ
          </a>
        </footer>
      </form>
    </main>
  );
}
