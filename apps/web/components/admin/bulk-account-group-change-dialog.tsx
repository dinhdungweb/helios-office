"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ModalDialog } from "@/components/ui/primitives";
import {
  bulkUpdateAccountGroupAction,
  type AccountFormState
} from "@/lib/account-access-actions";
import { CaretDown, CheckCircle, Users, X } from "@/lib/icons";
import type { AccountPermission, PermissionGroup } from "@/lib/account-access-api";

const initialState: AccountFormState = { ok: false };

function groupPermissionLabels(group: PermissionGroup, permissions: AccountPermission[]) {
  const allowedKeys = new Set(group.permissionKeys);

  return permissions
    .filter((permission) => allowedKeys.has(permission.key) && !permission.key.startsWith("permission."))
    .map((permission) => permission.label);
}

function GroupPermissionPreview({
  group,
  permissions
}: {
  group: PermissionGroup;
  permissions: AccountPermission[];
}) {
  const labels = groupPermissionLabels(group, permissions);

  return (
    <article className="account-group-preview-card">
      <header>
        <strong>Quyền được cấp</strong>
      </header>
      <ul>
        {labels.map((label) => <li key={label}>{label}</li>)}
        {labels.length === 0 ? <li>Chưa có quyền trong nhóm này</li> : null}
      </ul>
    </article>
  );
}

export function BulkAccountGroupChangeDialog({
  accountIds,
  groups,
  onSuccess,
  permissions
}: {
  accountIds: string[];
  groups: PermissionGroup[];
  onSuccess: () => void;
  permissions: AccountPermission[];
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [state, formAction, isPending] = useActionState(bulkUpdateAccountGroupAction, initialState);
  const assignableGroups = useMemo(
    () => groups.filter((group) => group.status !== "archived" && group.role !== "system_admin"),
    [groups]
  );
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isGroupListOpen, setIsGroupListOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const selectedGroup = assignableGroups.find((group) => group.id === selectedGroupId) ?? null;

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !dialogRef.current?.open) {
        dialogRef.current?.showModal();
      }
      return;
    }

    dialogRef.current?.close();
    setSuccessMessage(state.message ?? "Đã cập nhật nhóm người dùng.");
    setSelectedGroupId("");
    onSuccess();
    router.refresh();
  }, [onSuccess, router, state.error, state.message, state.ok]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSuccessMessage(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const openDialog = () => {
    setSelectedGroupId("");
    setIsGroupListOpen(false);
    dialogRef.current?.showModal();
  };

  return (
    <>
      {successMessage ? (
        <div className="account-group-change-success" role="status">
          <CheckCircle size={18} weight="fill" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      <button type="button" onClick={openDialog}>
        <Users size={16} weight="duotone" aria-hidden="true" />
        <span>Đổi nhóm</span>
      </button>

      <ModalDialog
        className="account-group-change-dialog bulk-account-group-change-dialog"
        ref={dialogRef}
        title="Cập nhật nhóm người dùng"
        onCloseRequest={() => dialogRef.current?.close()}
      >
        <form
          className="account-group-change-form"
          action={formAction}
          onSubmit={() => dialogRef.current?.close()}
        >
          {accountIds.map((accountId) => (
            <input name="accountIds" type="hidden" value={accountId} key={accountId} />
          ))}
          <input name="permissionGroupId" type="hidden" value={selectedGroupId} />

          <p className="bulk-account-group-summary">
            Đang tiến hành cập nhật nhóm cho <strong>{accountIds.length}</strong> tài khoản
          </p>

          <div
            className={
              isGroupListOpen || selectedGroup
                ? "account-group-select-block bulk-account-group-select-block is-floating"
                : "account-group-select-block bulk-account-group-select-block"
            }
          >
            <label htmlFor="bulk-account-group-select">Nhóm người dùng <mark>*</mark></label>
            <button
              id="bulk-account-group-select"
              className={isGroupListOpen ? "account-group-select is-open" : "account-group-select"}
              type="button"
              aria-expanded={isGroupListOpen}
              onClick={() => setIsGroupListOpen((current) => !current)}
            >
              <span>{selectedGroup?.name ?? ""}</span>
              <CaretDown className="account-group-select-arrow" size={17} weight="duotone" aria-hidden="true" />
            </button>
            {isGroupListOpen ? (
              <div className="account-group-option-list bulk-account-group-option-list">
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
                    <GroupPermissionPreview group={group} permissions={permissions} />
                  </button>
                ))}
              </div>
            ) : selectedGroup ? (
              <div className="account-group-selected-preview">
                <GroupPermissionPreview group={selectedGroup} permissions={permissions} />
              </div>
            ) : null}
          </div>

          <div className="account-group-change-note">
            <p>Khi chuyển người dùng sang nhóm mới:</p>
            <p>+ Quyền tùy chỉnh riêng của các tài khoản sẽ được xóa.</p>
            <p>+ Người dùng sẽ kế thừa toàn bộ quyền của nhóm mới.</p>
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
