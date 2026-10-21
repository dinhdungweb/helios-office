"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ModalDialog } from "@/components/ui/primitives";
import { forceLogoutAction } from "@/lib/login-activity-actions";
import { CheckCircle, Logout, X } from "@/lib/icons";

function ConfirmDialog({ accountId, accountName, onClose }: { accountId: string; accountName: string; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const confirm = () =>
    startTransition(async () => {
      const outcome = await forceLogoutAction(accountId);
      setResult(outcome.ok ? { ok: true, text: outcome.message } : { ok: false, text: outcome.error });
      if (outcome.ok) router.refresh();
    });

  return (
    <ModalDialog className="password-dialog" ref={dialogRef} title="Buộc đăng xuất" onCloseRequest={onClose} onCancel={onClose}>
      <div className="account-dialog-form">
        {result?.ok ? (
          <p className="password-dialog-success" role="status">
            <CheckCircle size={18} weight="fill" aria-hidden="true" />
            {result.text}
          </p>
        ) : (
          <p className="password-dialog-target">
            Đăng xuất <strong>{accountName}</strong> khỏi mọi thiết bị ngay lập tức. Người dùng phải đăng nhập lại; mật khẩu không đổi.
          </p>
        )}
        {result && !result.ok ? <p className="account-dialog-error" role="alert">{result.text}</p> : null}
        <footer className="account-dialog-actions">
          {result?.ok ? (
            <Button variant="primary" onClick={onClose}>Đóng</Button>
          ) : (
            <>
              <Button variant="secondary" icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={onClose}>
                Hủy bỏ
              </Button>
              <Button variant="primary" disabled={isPending} icon={<Logout size={16} weight="duotone" aria-hidden="true" />} onClick={confirm}>
                {isPending ? "Đang xử lý" : "Buộc đăng xuất"}
              </Button>
            </>
          )}
        </footer>
      </div>
    </ModalDialog>
  );
}

// AU-17 on the account detail page.
export function AccountForceLogoutButton({ accountId, accountName, disabled }: { accountId: string; accountName: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="admin-account-action-button" disabled={disabled} type="button" onClick={() => setOpen(true)}>
        <Logout size={15} weight="duotone" aria-hidden="true" />
        Buộc đăng xuất
      </button>
      {open ? <ConfirmDialog accountId={accountId} accountName={accountName} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
