"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, ModalDialog } from "@/components/ui/primitives";
import { FormCheckbox } from "@/components/ui/form-controls";
import { resetAccountPasswordAction, type PasswordFormState } from "@/lib/password-actions";
import { CheckCircle, ClipboardText, EnvelopeSimple, Key, X } from "@/lib/icons";
import type { ManagedUserAccount } from "@/lib/account-access-api";

type ResetMethod = "email" | "temporary_password";

const initialState: PasswordFormState = { ok: false };

function ResetDialog({ account, initialMethod, onClose }: { account: ManagedUserAccount; initialMethod: ResetMethod; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [method, setMethod] = useState<ResetMethod>(initialMethod);
  const [copied, setCopied] = useState(false);
  const [state, formAction, isPending] = useActionState(resetAccountPasswordAction, initialState);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const copyPassword = async () => {
    if (!state.temporaryPassword) return;
    await navigator.clipboard.writeText(state.temporaryPassword).catch(() => undefined);
    setCopied(true);
  };

  return (
    <ModalDialog className="password-dialog" ref={dialogRef} title="Đặt lại mật khẩu" onCloseRequest={onClose} onCancel={onClose}>
      {state.ok ? (
        <div className="account-dialog-form">
          <p className="password-dialog-success" role="status">
            <CheckCircle size={18} weight="fill" aria-hidden="true" />
            {state.message}
          </p>
          {state.temporaryPassword ? (
            <div className="password-dialog-secret">
              <span>Mật khẩu tạm (chỉ hiển thị một lần, hãy gửi cho người dùng qua kênh riêng):</span>
              <div>
                <code>{state.temporaryPassword}</code>
                <Button variant="secondary" icon={<ClipboardText size={16} weight="duotone" aria-hidden="true" />} onClick={copyPassword}>
                  {copied ? "Đã chép" : "Sao chép"}
                </Button>
              </div>
            </div>
          ) : null}
          <footer className="account-dialog-actions">
            <Button variant="primary" onClick={onClose}>Đóng</Button>
          </footer>
        </div>
      ) : (
        <form className="account-dialog-form" action={formAction}>
          <input name="accountId" type="hidden" value={account.id} />
          <input name="method" type="hidden" value={method} />
          <p className="password-dialog-target">
            Tài khoản: <strong>{account.name}</strong> ({account.email})
          </p>

          <fieldset className="password-dialog-methods">
            <legend>Cách đặt lại</legend>
            <label>
              <input checked={method === "email"} name="methodChoice" type="radio" onChange={() => setMethod("email")} />
              <span>
                <strong>Gửi email đặt lại mật khẩu</strong>
                <small>Người dùng tự đặt mật khẩu mới qua đường dẫn trong email. Cần bật SMTP.</small>
              </span>
            </label>
            <label>
              <input checked={method === "temporary_password"} name="methodChoice" type="radio" onChange={() => setMethod("temporary_password")} />
              <span>
                <strong>Đặt mật khẩu tạm</strong>
                <small>Người dùng phải đổi sang mật khẩu mới ở lần đăng nhập tới.</small>
              </span>
            </label>
          </fieldset>

          {method === "temporary_password" ? (
            <label className="account-dialog-field">
              <span>Mật khẩu tạm (để trống để hệ thống tự tạo)</span>
              <input name="temporaryPassword" type="text" autoComplete="off" minLength={8} spellCheck={false} />
            </label>
          ) : null}

          <FormCheckbox defaultChecked label="Đăng xuất tài khoản khỏi mọi thiết bị" name="signOutSessions" />

          {state.error ? <p className="account-dialog-error" role="alert">{state.error}</p> : null}

          <footer className="account-dialog-actions">
            <Button variant="secondary" icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" disabled={isPending} icon={<CheckCircle size={16} weight="duotone" aria-hidden="true" />}>
              {isPending ? "Đang xử lý" : "Đặt lại"}
            </Button>
          </footer>
        </form>
      )}
    </ModalDialog>
  );
}

// AU-15: "Gửi mật khẩu" and "Đổi mật khẩu" on the account detail page open the same dialog with a
// different method preselected.
export function AccountPasswordResetActions({ account }: { account: ManagedUserAccount }) {
  const [openMethod, setOpenMethod] = useState<ResetMethod | null>(null);
  const disabled = account.status === "closed";
  const title = disabled ? "Tài khoản đã đóng" : undefined;

  return (
    <>
      <button className="admin-account-action-button" disabled={disabled} title={title} type="button" onClick={() => setOpenMethod("email")}>
        <EnvelopeSimple size={15} weight="duotone" aria-hidden="true" />
        Gửi mật khẩu
      </button>
      <button className="admin-account-action-button" disabled={disabled} title={title} type="button" onClick={() => setOpenMethod("temporary_password")}>
        <Key size={15} weight="duotone" aria-hidden="true" />
        Đổi mật khẩu
      </button>
      {openMethod ? <ResetDialog account={account} initialMethod={openMethod} onClose={() => setOpenMethod(null)} /> : null}
    </>
  );
}
