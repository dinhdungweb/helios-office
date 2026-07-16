"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormCheckbox, FormSelect } from "@/components/ui/form-controls";
import { Button, FormField, FormInput, FormTextarea, IconButton, ModalDialog } from "@/components/ui/primitives";
import { CheckCircle, PencilSimple, X } from "@/lib/icons";
import {
  updateAccountAction,
  type AccountFormState
} from "@/lib/account-access-actions";
import type {
  AccountLifecycleStatus,
  AccountPermission,
  AccountRole,
  ManagedUserAccount,
  PermissionGroup
} from "@/lib/account-access-api";

const roleOptions: Array<{ value: AccountRole; label: string }> = [
  { value: "user", label: "User" }
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
  permissions: AccountPermission[];
};

function DialogForm({
  account,
  groups,
  permissions,
  onClose
}: AccountEditorDialogProps & {
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(updateAccountAction, initialState);
  const selectedPermissions = new Set(account?.customPermissionKeys ?? []);
  const visiblePermissions = permissions.filter((permission) => !permission.key.startsWith("permission."));
  const assignableGroups = groups.filter((group) => group.status !== "archived" || group.id === account?.groupId);

  useEffect(() => {
    if (state.ok) {
      onClose();
    }
  }, [onClose, state.ok]);

  return (
    <form className="account-dialog-form" action={formAction}>
      {account ? <input name="accountId" type="hidden" value={account.id} /> : null}

      <div className="account-dialog-grid">
        <FormField label="Họ tên">
          <FormInput name="displayName" type="text" required minLength={2} defaultValue={account?.name ?? ""} />
        </FormField>

        <FormField label="Email">
          <FormInput name="email" type="email" required defaultValue={account?.email ?? ""} />
        </FormField>

        <FormField label="Quyền">
          <FormSelect
            ariaLabel="Chọn quyền"
            defaultValue={account?.role ?? "user"}
            menuLabel="Quyền tài khoản"
            name="adminRole"
            options={roleOptions}
            placeholder="Chọn quyền"
          />
        </FormField>

        <FormField label="Nhóm quyền">
          <FormSelect
            ariaLabel="Chọn nhóm quyền"
            defaultValue={account?.groupId ?? "none"}
            menuLabel="Danh sách nhóm quyền"
            name="permissionGroupId"
            options={[
              { value: "none", label: "Chưa gán" },
              ...assignableGroups.map((group) => ({
                value: group.id,
                label: group.name,
                description: group.summary
              }))
            ]}
            placeholder="Chưa gán"
          />
        </FormField>

        <FormField label="Trạng thái">
          <FormSelect
            ariaLabel="Chọn trạng thái"
            defaultValue={account?.status ?? "pending_activation"}
            menuLabel="Trạng thái tài khoản"
            name="accountStatus"
            options={statusOptions}
            placeholder="Chọn trạng thái"
          />
        </FormField>
      </div>

      <fieldset className="account-dialog-permissions">
        <legend>Quyền cá nhân</legend>
        <div className="account-dialog-permission-grid">
          {visiblePermissions.map((permission) => (
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

      <FormField label="Ghi chú quyền riêng" wide>
        <FormTextarea name="customPermissionNote" rows={3} defaultValue={account?.customPermissionNote ?? ""} />
      </FormField>

      {state.error ? <p className="account-dialog-error">{state.error}</p> : null}

      <div className="account-dialog-actions">
        <Button variant="secondary" icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" type="submit" disabled={isPending} icon={<CheckCircle size={16} weight="duotone" aria-hidden="true" />}>
          {isPending ? "Đang lưu" : "Lưu"}
        </Button>
      </div>
    </form>
  );
}

export function AccountEditDialog({ account, groups, permissions }: AccountEditorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  if (!account) {
    return null;
  }

  return (
    <>
      <IconButton label={`Chỉnh quyền ${account.name}`} title="Chỉnh quyền" onClick={() => dialogRef.current?.showModal()}>
        <PencilSimple size={16} weight="duotone" aria-hidden="true" />
      </IconButton>
      <ModalDialog className="account-edit-dialog" ref={dialogRef} title="Sửa tài khoản" onCloseRequest={() => dialogRef.current?.close()}>
        <DialogForm
          account={account}
          groups={groups}
          permissions={permissions}
          onClose={() => dialogRef.current?.close()}
        />
      </ModalDialog>
    </>
  );
}
