"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, ModalDialog } from "@/components/ui/primitives";
import { changeOwnPasswordAction, type PasswordFormState } from "@/lib/password-actions";
import { CheckCircle, X } from "@/lib/icons";

const initialState: PasswordFormState = { ok: false };

// AU-13: the signed-in user changes their own password. Mounted only while open.
export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [state, formAction, isPending] = useActionState(changeOwnPasswordAction, initialState);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <ModalDialog className="password-dialog" ref={dialogRef} title="Đổi mật khẩu" onCloseRequest={onClose} onCancel={onClose}>
      {state.ok ? (
        <div className="account-dialog-form">
          <p className="password-dialog-success" role="status">
            <CheckCircle size={18} weight="fill" aria-hidden="true" />
            {state.message}
          </p>
          <footer className="account-dialog-actions">
            <Button variant="primary" onClick={onClose}>Đóng</Button>
          </footer>
        </div>
      ) : (
        <form className="account-dialog-form" action={formAction}>
          <label className="account-dialog-field">
            <span>Mật khẩu hiện tại *</span>
            <input name="currentPassword" type="password" autoComplete="current-password" required />
          </label>
          <label className="account-dialog-field">
            <span>Mật khẩu mới * (ít nhất 8 ký tự)</span>
            <input name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <label className="account-dialog-field">
            <span>Nhập lại mật khẩu mới *</span>
            <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
          </label>

          {state.error ? <p className="account-dialog-error" role="alert">{state.error}</p> : null}

          <footer className="account-dialog-actions">
            <Button variant="secondary" icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" disabled={isPending} icon={<CheckCircle size={16} weight="duotone" aria-hidden="true" />}>
              {isPending ? "Đang lưu" : "Đổi mật khẩu"}
            </Button>
          </footer>
        </form>
      )}
    </ModalDialog>
  );
}
