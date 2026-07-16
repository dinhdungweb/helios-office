"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, ModalDialog } from "@/components/ui/primitives";
import {
  bulkArchiveDepartmentsAction,
  bulkDeleteDepartmentsAction,
  type DepartmentFormState
} from "@/lib/org-chart-actions";
import { CheckCircle, Lock, Trash, X } from "@/lib/icons";

const initialState: DepartmentFormState = { ok: false };

export function DepartmentBulkConfirmDialog({
  departmentIds,
  mode,
  onSuccess
}: {
  departmentIds: string[];
  mode: "archive" | "delete";
  onSuccess: (message: string) => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const action = mode === "archive" ? bulkArchiveDepartmentsAction : bulkDeleteDepartmentsAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const label = mode === "archive" ? "Đóng" : "Xóa";
  const ActionIcon = mode === "archive" ? Lock : Trash;

  useEffect(() => {
    if (state.ok) {
      dialogRef.current?.close();
      onSuccess(state.message ?? `Đã ${label.toLowerCase()} phòng ban.`);
      router.refresh();
      return;
    }

    if (state.error && !dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, [label, onSuccess, router, state.error, state.message, state.ok]);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()}>
        <ActionIcon size={16} weight="duotone" aria-hidden="true" />
        <span>{label}</span>
      </button>

      <ModalDialog
        className="department-bulk-confirm-dialog"
        ref={dialogRef}
        title={`${label} phòng ban`}
        onCloseRequest={() => dialogRef.current?.close()}
      >
        <form className="department-bulk-confirm-form" action={formAction}>
          {departmentIds.map((id) => <input name="departmentIds" type="hidden" value={id} key={id} />)}
          <p>
            {mode === "archive"
              ? `Đóng ${departmentIds.length} phòng ban đã chọn? Phòng ban còn nhân sự hoặc phòng ban con sẽ không thể đóng.`
              : `Xóa vĩnh viễn ${departmentIds.length} phòng ban đã chọn? Chỉ phòng ban đã đóng và không còn dữ liệu liên kết mới được xóa.`}
          </p>
          {state.error ? <p className="account-dialog-error" role="alert">{state.error}</p> : null}
          <footer className="account-dialog-actions">
            <Button variant="secondary" icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={() => dialogRef.current?.close()}>
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" isLoading={isPending} icon={<CheckCircle size={16} weight="duotone" aria-hidden="true" />}>
              Xác nhận
            </Button>
          </footer>
        </form>
      </ModalDialog>
    </>
  );
}
