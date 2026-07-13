"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ModalDialog } from "@/components/ui/primitives";
import { updateAccountAction, type AccountFormState } from "@/lib/account-access-actions";
import { CheckCircle, X, Users } from "@/lib/icons";
import type { AccountPermission, ManagedUserAccount, PermissionGroup } from "@/lib/account-access-api";

const initialState: AccountFormState = {
  ok: false
};

type PermissionPreviewItem = {
  key: string;
  label: string;
};

function accountLogin(account: ManagedUserAccount) {
  return account.email.includes("@") ? account.email.split("@")[0] : account.email;
}

function permissionItemsFor(group: PermissionGroup, permissions: AccountPermission[]) {
  const allowedKeys = group.role === "system_admin" ? permissions.map((permission) => permission.key) : group.permissionKeys;
  const allowedKeySet = new Set(allowedKeys);

  return permissions.filter((permission) => allowedKeySet.has(permission.key));
}

function summarizePermissionItems(permissions: AccountPermission[]): PermissionPreviewItem[] {
  const items: PermissionPreviewItem[] = [];
  const sidebarModules: string[] = [];
  let sidebarSummaryIndex = -1;

  for (const permission of permissions) {
    const sidebarModuleMatch = permission.label.match(/^Thêm module (.+) vào sidebar$/);

    if (sidebarModuleMatch) {
      sidebarModules.push(sidebarModuleMatch[1]);

      if (sidebarSummaryIndex === -1) {
        sidebarSummaryIndex = items.length;
        items.push({
          key: "sidebar-module-summary",
          label: "Thêm module vào sidebar"
        });
      }

      continue;
    }

    items.push({
      key: permission.key,
      label: permission.label
    });
  }

  if (sidebarSummaryIndex >= 0) {
    items[sidebarSummaryIndex] = {
      key: "sidebar-module-summary",
      label: `Thêm module vào sidebar (${sidebarModules.length} module)`
    };
  }

  return items;
}

function PermissionPreviewCard({
  group,
  permissions
}: {
  group: PermissionGroup;
  permissions: AccountPermission[];
}) {
  const previewItems = summarizePermissionItems(permissionItemsFor(group, permissions));

  return (
    <article className="account-group-preview-card">
      <header>
        <strong>Quyền được cấp</strong>
      </header>
      <ul>
        {previewItems.map((permission) => (
          <li key={permission.key}>{permission.label}</li>
        ))}
        {previewItems.length === 0 ? <li>Chưa có quyền trong nhóm này</li> : null}
      </ul>
    </article>
  );
}

export function AccountGroupChangeDialog({
  account,
  groups,
  permissions
}: {
  account: ManagedUserAccount;
  groups: PermissionGroup[];
  permissions: AccountPermission[];
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [state, formAction, isPending] = useActionState(updateAccountAction, initialState);
  const assignableGroups = useMemo(
    () => groups.filter((group) => group.role === "user" && (group.status !== "archived" || group.id === account.groupId)),
    [account.groupId, groups]
  );
  const [selectedGroupId, setSelectedGroupId] = useState(account.groupId ?? assignableGroups[0]?.id ?? "");
  const [isGroupListOpen, setIsGroupListOpen] = useState(false);
  const selectedGroup = assignableGroups.find((group) => group.id === selectedGroupId) ?? null;

  useEffect(() => {
    if (state.ok) {
      dialogRef.current?.close();
      router.refresh();
    }
  }, [router, state.ok]);

  const openDialog = () => {
    setSelectedGroupId(account.groupId ?? assignableGroups[0]?.id ?? "");
    setIsGroupListOpen(false);
    dialogRef.current?.showModal();
  };

  return (
    <>
      <button className="admin-account-action-button" type="button" onClick={openDialog}>
        <Users size={15} weight="duotone" aria-hidden="true" />
        Đổi nhóm
      </button>

      <ModalDialog
        className="account-group-change-dialog"
        ref={dialogRef}
        title="Cập nhật nhóm người dùng"
        onCloseRequest={() => dialogRef.current?.close()}
      >
        <form className="account-group-change-form" action={formAction}>
          <input name="accountId" type="hidden" value={account.id} />
          <input name="displayName" type="hidden" value={account.name} />
          <input name="email" type="hidden" value={account.email} />
          <input name="adminRole" type="hidden" value={account.role} />
          <input name="accountStatus" type="hidden" value={account.status} />
          <input name="permissionGroupId" type="hidden" value={selectedGroupId} />
          {account.customPermissionKeys.map((permissionKey) => (
            <input name="customPermissionKeys" type="hidden" value={permissionKey} key={permissionKey} />
          ))}
          {account.customPermissionNote ? <input name="customPermissionNote" type="hidden" value={account.customPermissionNote} /> : null}

          <div className="account-group-change-grid">
            <label>
              <span>Tài khoản</span>
              <input type="text" value={accountLogin(account)} disabled />
            </label>
            <label>
              <span>Họ tên</span>
              <input type="text" value={account.name} disabled />
            </label>
          </div>

          <div className="account-group-select-block">
            <label htmlFor="account-group-select-button">Nhóm người dùng <mark>*</mark></label>
            <button
              id="account-group-select-button"
              className={isGroupListOpen ? "account-group-select is-open" : "account-group-select"}
              type="button"
              aria-expanded={isGroupListOpen}
              onClick={() => setIsGroupListOpen((current) => !current)}
            >
              <span>{selectedGroup?.name ?? "Chọn nhóm người dùng"}</span>
              <i aria-hidden="true" />
            </button>

            {isGroupListOpen ? (
              <div className="account-group-option-list">
                {assignableGroups.map((group) => (
                  <button
                    className={group.id === selectedGroupId ? "account-group-option is-selected" : "account-group-option"}
                    type="button"
                    key={group.id}
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setIsGroupListOpen(false);
                    }}
                  >
                    <strong>{group.name}</strong>
                    <PermissionPreviewCard group={group} permissions={permissions} />
                  </button>
                ))}
              </div>
            ) : selectedGroup ? (
              <div className="account-group-selected-preview">
                <PermissionPreviewCard group={selectedGroup} permissions={permissions} />
              </div>
            ) : null}
          </div>

          <div className="account-group-change-note">
            <p>Khi chuyển người dùng sang 1 nhóm mới:</p>
            <p>+ Người dùng chưa được tùy chỉnh quyền sẽ được cấp quyền theo nhóm mới.</p>
            <p>+ Người dùng đã được tùy chỉnh quyền sẽ giữ nguyên quyền tùy chỉnh.</p>
          </div>

          {state.error ? <p className="account-dialog-error">{state.error}</p> : null}

          <footer className="account-dialog-actions account-group-change-actions">
            <Button variant="secondary" icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={() => dialogRef.current?.close()}>
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" disabled={isPending || !selectedGroupId} icon={<CheckCircle size={16} weight="duotone" aria-hidden="true" />}>
              {isPending ? "Đang cập nhật" : "Cập nhật"}
            </Button>
          </footer>
        </form>
      </ModalDialog>
    </>
  );
}
