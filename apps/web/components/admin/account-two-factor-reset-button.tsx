"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ModalDialog } from "@/components/ui/primitives";
import { resetAccountTwoFactorAction } from "@/lib/two-factor-actions";
import { CheckCircle, ShieldCheck, X } from "@/lib/icons";

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
      const outcome = await resetAccountTwoFactorAction(accountId);
      setResult(outcome.ok ? { ok: true, text: "Đã đặt lại bảo mật 2 lớp. Lần đăng nhập tới người dùng thiết lập lại app." } : { ok: false, text: outcome.error });
      if (outcome.ok) router.refresh();
    });

  return (
    <ModalDialog className="password-dialog" ref={dialogRef} title="Đặt lại bảo mật 2 lớp" onCloseRequest={onClose} onCancel={onClose}>
      <div className="account-dialog-form">
        {result?.ok ? (
          <p className="password-dialog-success" role="status">
            <CheckCircle size={18} weight="fill" aria-hidden="true" />
            {result.text}
          </p>
        ) : (
          <p className="password-dialog-target">
            Gỡ app xác thực của <strong>{accountName}</strong> (ví dụ khi mất điện thoại) và huỷ các phiên đã xác thực. Chỉ làm khi đã xác minh
            đúng người yêu cầu.
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
              <Button variant="primary" disabled={isPending} icon={<ShieldCheck size={16} weight="duotone" aria-hidden="true" />} onClick={confirm}>
                {isPending ? "Đang xử lý" : "Đặt lại"}
              </Button>
            </>
          )}
        </footer>
      </div>
    </ModalDialog>
  );
}

// AU-18 admin action on the account detail page.
export function AccountTwoFactorResetButton({ accountId, accountName }: { accountId: string; accountName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="admin-account-action-button" type="button" onClick={() => setOpen(true)}>
        <ShieldCheck size={15} weight="duotone" aria-hidden="true" />
        Đặt lại 2FA
      </button>
      {open ? <ConfirmDialog accountId={accountId} accountName={accountName} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
