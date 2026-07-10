"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormCheckbox, FormSelect } from "@/components/ui/form-controls";
import { CheckCircle, PencilSimple, X } from "@/lib/icons";
import type {
  AccountLifecycleStatus,
  AccountLicense,
  AccountPermission,
  AccountRole,
  ManagedUserAccount,
  PermissionGroup
} from "@/lib/account-access-api";
import {
  updateAccountAction,
  type AccountFormState
} from "@/lib/account-access-actions";

const roleOptions: Array<{ value: AccountRole; label: string }> = [
  { value: "user", label: "User" },
  { value: "system_admin", label: "Admin" }
];

const statusOptions: Array<{ value: AccountLifecycleStatus; label: string }> = [
  { value: "pending_activation", label: "Chưa kích hoạt" },
  { value: "active", label: "Đang hoạt động" },
  { value: "closed", label: "Đã đóng" }
];

const initialState: AccountFormState = {
  ok: false
};

type AccountEditorDialogProps = {
  account?: ManagedUserAccount;
  groups: PermissionGroup[];
  licenses: AccountLicense[];
  permissions: AccountPermission[];
};

function DialogForm({
  account,
  groups,
  licenses,
  permissions,
  onClose
}: AccountEditorDialogProps & {
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(updateAccountAction, initialState);
  const selectedPermissions = new Set(account?.customPermissionKeys ?? []);

  useEffect(() => {
    if (state.ok) {
      onClose();
    }
  }, [onClose, state.ok]);

  return (
    <form className="account-dialog-form" action={formAction}>
      {account ? <input name="accountId" type="hidden" value={account.id} /> : null}

      <div className="account-dialog-grid">
        <label className="account-dialog-field">
          <span>Họ tên</span>
          <input name="displayName" type="text" required minLength={2} defaultValue={account?.name ?? ""} />
        </label>

        <label className="account-dialog-field">
          <span>Email</span>
          <input name="email" type="email" required defaultValue={account?.email ?? ""} />
        </label>

        <label className="account-dialog-field">
          <span>Quyền</span>
          <FormSelect
            ariaLabel="Chọn quyền"
            defaultValue={account?.role ?? "user"}
            menuLabel="Quyền tài khoản"
            name="adminRole"
            options={roleOptions}
            placeholder="Chọn quyền"
          />
        </label>

        <label className="account-dialog-field">
          <span>License</span>
          <FormSelect
            ariaLabel="Chọn license"
            defaultValue={account?.licensePlan ?? licenses[0]?.key ?? "standard"}
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

        <label className="account-dialog-field">
          <span>Nhóm quyền</span>
          <FormSelect
            ariaLabel="Chọn nhóm quyền"
            defaultValue={account?.groupId ?? "none"}
            menuLabel="Danh sách nhóm quyền"
            name="permissionGroupId"
            options={[
              { value: "none", label: "Chưa gán" },
              ...groups.map((group) => ({
                value: group.id,
                label: group.name,
                description: group.summary
              }))
            ]}
            placeholder="Chưa gán"
          />
        </label>

        <label className="account-dialog-field">
          <span>Trạng thái</span>
          <FormSelect
            ariaLabel="Chọn trạng thái"
            defaultValue={account?.status ?? "pending_activation"}
            menuLabel="Trạng thái tài khoản"
            name="accountStatus"
            options={statusOptions}
            placeholder="Chọn trạng thái"
          />
        </label>
      </div>

      <fieldset className="account-dialog-permissions">
        <legend>Quyền cá nhân</legend>
        <div className="account-dialog-permission-grid">
          {permissions.map((permission) => (
            <FormCheckbox
              name="customPermissionKeys"
              value={permission.key}
              defaultChecked={selectedPermissions.has(permission.key)}
              label={permission.label}
              key={permission.key}
            />
          ))}
        </div>
      </fieldset>

      <label className="account-dialog-field account-dialog-field--wide">
        <span>Ghi chú quyền riêng</span>
        <textarea name="customPermissionNote" rows={3} defaultValue={account?.customPermissionNote ?? ""} />
      </label>

      {state.error ? <p className="account-dialog-error">{state.error}</p> : null}

      <div className="account-dialog-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          <X size={16} weight="duotone" aria-hidden="true" />
          Hủy
        </button>
        <button className="primary-button" type="submit" disabled={isPending}>
          <CheckCircle size={16} weight="duotone" aria-hidden="true" />
          {isPending ? "Đang lưu" : "Lưu"}
        </button>
      </div>
    </form>
  );
}

export function AccountEditDialog({ account, groups, licenses, permissions }: AccountEditorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  if (!account) {
    return null;
  }

  return (
    <>
      <button
        className="icon-button"
        type="button"
        aria-label={`Chỉnh quyền ${account.name}`}
        title="Chỉnh quyền"
        onClick={() => dialogRef.current?.showModal()}
      >
        <PencilSimple size={16} weight="duotone" aria-hidden="true" />
      </button>
      <dialog className="account-dialog" ref={dialogRef}>
        <header className="account-dialog-header">
          <h2>Sửa tài khoản</h2>
          <button className="icon-button" type="button" aria-label="Đóng" onClick={() => dialogRef.current?.close()}>
            <X size={16} weight="duotone" aria-hidden="true" />
          </button>
        </header>
        <DialogForm
          account={account}
          groups={groups}
          licenses={licenses}
          permissions={permissions}
          onClose={() => dialogRef.current?.close()}
        />
      </dialog>
    </>
  );
}
