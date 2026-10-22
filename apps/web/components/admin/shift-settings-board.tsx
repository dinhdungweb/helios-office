"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalDialog, StateBlock } from "@/components/ui/primitives";
import { archiveShiftAction, deleteShiftAction, restoreShiftAction, saveShiftAction, type ShiftActionResult } from "@/lib/shift-actions";
import { minuteToTime, type AttendancePolicy, type ShiftRecord, type ShiftSettingsData } from "@/lib/shift-format";
import { Plus } from "@/lib/icons";

const LATE_MODE_LABELS = { full: "Tính toàn bộ phút", excess: "Chỉ tính phần vượt ngưỡng" } as const;
const MISSING_LABELS = { pending: "0 công, chờ giải trình", half: "Nửa công", scheduled: "Lấy giờ chuẩn của ca" } as const;

function hours(minutes: number) {
  const value = minutes / 60;
  return `${Number.isInteger(value) ? value : value.toFixed(1)} giờ`;
}

function timeRange(shift: ShiftRecord) {
  return `${minuteToTime(shift.startMinute)}–${minuteToTime(shift.endMinute)}`;
}

function ShiftDialog({ onClose, policy, shift }: { onClose: () => void; policy: AttendancePolicy; shift: ShiftRecord | null }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [state, formAction, isPending] = useActionState(saveShiftAction, null);
  const [type, setType] = useState(shift?.type ?? "fixed");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [onClose, router, state]);

  return (
    <ModalDialog className="shift-dialog" ref={dialogRef} title={shift ? `Sửa ca ${shift.code}` : "Tạo ca làm việc"} onCloseRequest={onClose} onCancel={onClose}>
      <form className="account-dialog-form" action={formAction}>
        <input name="shiftId" type="hidden" value={shift?.id ?? ""} />
        <div className="shift-dialog-grid">
          <label className="account-dialog-field">
            <span>Mã ca *</span>
            <input defaultValue={shift?.code} maxLength={12} name="code" placeholder="VD: HC, CD, C1" required />
          </label>
          <label className="account-dialog-field">
            <span>Tên ca *</span>
            <input defaultValue={shift?.name} minLength={2} name="name" placeholder="VD: Ca đêm" required />
          </label>
          <label className="account-dialog-field">
            <span>Loại ca</span>
            <select name="type" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
              <option value="fixed">Cố định (giờ vào/ra cố định)</option>
              <option value="flexible">Linh hoạt (đủ số giờ trong khung)</option>
            </select>
          </label>
          <label className="account-dialog-field">
            <span>Màu trên lịch</span>
            <input defaultValue={shift?.color ?? "#2563eb"} name="color" type="color" />
          </label>
          <label className="account-dialog-field">
            <span>{type === "flexible" ? "Khung từ *" : "Giờ vào *"}</span>
            <input defaultValue={minuteToTime(shift?.startMinute ?? 480)} name="start" required type="time" />
          </label>
          <label className="account-dialog-field">
            <span>{type === "flexible" ? "Khung đến *" : "Giờ ra *"} (nhỏ hơn giờ vào = qua đêm)</span>
            <input defaultValue={minuteToTime(shift?.endMinute ?? 1020)} name="end" required type="time" />
          </label>
          <label className="account-dialog-field">
            <span>Nghỉ giữa ca từ</span>
            <input defaultValue={minuteToTime(shift?.breakStartMinute)} name="breakStart" type="time" />
          </label>
          <label className="account-dialog-field">
            <span>Nghỉ giữa ca đến</span>
            <input defaultValue={minuteToTime(shift?.breakEndMinute)} name="breakEnd" type="time" />
          </label>
          {type === "flexible" ? (
            <label className="account-dialog-field">
              <span>Số giờ cần làm *</span>
              <input defaultValue={shift?.type === "flexible" ? shift.requiredMinutes / 60 : 8} min="0.5" name="requiredHours" step="0.5" type="number" />
            </label>
          ) : null}
          <label className="account-dialog-field">
            <span>Số công khi đủ giờ</span>
            <input defaultValue={shift?.workUnits ?? 1} max="3" min="0.25" name="workUnits" step="0.25" type="number" />
          </label>
        </div>

        <details className="shift-dialog-overrides" open={Boolean(shift && (shift.lateGraceMinutes !== null || shift.earlyGraceMinutes !== null || shift.lateCountMode || shift.missingPunchMode))}>
          <summary>Quy tắc riêng của ca (để trống = theo chính sách chung)</summary>
          <div className="shift-dialog-grid">
            <label className="account-dialog-field">
              <span>Cho phép đi muộn (phút) — chung: {policy.lateGraceMinutes}</span>
              <input defaultValue={shift?.lateGraceMinutes ?? ""} max="120" min="0" name="lateGraceMinutes" type="number" />
            </label>
            <label className="account-dialog-field">
              <span>Cho phép về sớm (phút) — chung: {policy.earlyGraceMinutes}</span>
              <input defaultValue={shift?.earlyGraceMinutes ?? ""} max="120" min="0" name="earlyGraceMinutes" type="number" />
            </label>
            <label className="account-dialog-field">
              <span>Muộn/sớm vượt ngưỡng</span>
              <select defaultValue={shift?.lateCountMode ?? ""} name="lateCountMode">
                <option value="">Theo chính sách ({LATE_MODE_LABELS[policy.lateCountMode]})</option>
                <option value="full">{LATE_MODE_LABELS.full}</option>
                <option value="excess">{LATE_MODE_LABELS.excess}</option>
              </select>
            </label>
            <label className="account-dialog-field">
              <span>Quên chấm vào/ra</span>
              <select defaultValue={shift?.missingPunchMode ?? ""} name="missingPunchMode">
                <option value="">Theo chính sách ({MISSING_LABELS[policy.missingPunchMode]})</option>
                <option value="pending">{MISSING_LABELS.pending}</option>
                <option value="half">{MISSING_LABELS.half}</option>
                <option value="scheduled">{MISSING_LABELS.scheduled}</option>
              </select>
            </label>
          </div>
        </details>

        <label className="account-dialog-field">
          <span>Ghi chú</span>
          <input defaultValue={shift?.description ?? ""} maxLength={500} name="description" />
        </label>

        {state && !state.ok ? <p className="account-dialog-error" role="alert">{state.error}</p> : null}
        <div className="account-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>HỦY BỎ</button>
          <button className="primary-button" disabled={isPending} type="submit">{isPending ? "ĐANG LƯU..." : "LƯU"}</button>
        </div>
      </form>
    </ModalDialog>
  );
}

// AT-05: shift catalogue. Shifts in use are archived rather than deleted.
export function ShiftSettingsBoard({ data }: { data: ShiftSettingsData }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ShiftRecord | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (data.source === "unavailable") {
    return (
      <StateBlock tone="error" title="Chưa kết nối được API chấm công">
        {data.error}
      </StateBlock>
    );
  }

  const run = (action: () => Promise<ShiftActionResult>) =>
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (result.ok) router.refresh();
      else setMessage(result.error);
    });

  const remove = (shift: ShiftRecord) => {
    if (!window.confirm(`Xoá ca ${shift.code}? Ca đã dùng thì hãy lưu trữ.`)) return;
    run(() => deleteShiftAction(shift.id));
  };

  return (
    <section className="personnel-catalog-panel shift-catalog-panel" aria-labelledby="shift-page-title">
      <header className="personnel-catalog-header">
        <h2 id="shift-page-title">Cài đặt ca</h2>
        <div className="personnel-catalog-actions">
          <button type="button" onClick={() => setEditing("new")}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Tạo mới
          </button>
        </div>
      </header>

      <p className="shift-catalog-hint">
        Ca mặc định của công ty: <strong>{data.policy.defaultShift ? `${data.policy.defaultShift.code} — ${data.policy.defaultShift.name}` : "chưa chọn"}</strong>, áp cho
        các ngày làm việc của người chưa được xếp ca. Đổi ở <a href="/admin/settings/attendance-policy">Chính sách chấm công</a>.
      </p>
      {message ? <p className="personnel-catalog-message is-error" role="alert">{message}</p> : null}

      <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Bảng ca làm việc có thể cuộn ngang">
        <table className="personnel-catalog-table shift-catalog-table">
          <thead>
            <tr>
              <th scope="col">Mã</th>
              <th scope="col">Tên ca</th>
              <th scope="col">Giờ làm</th>
              <th scope="col">Nghỉ giữa ca</th>
              <th scope="col">Giờ công</th>
              <th scope="col">Số công</th>
              <th scope="col">Muộn / sớm cho phép</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.shifts.map((shift) => {
              const isDefault = shift.usage.companyDefault || shift.usage.departmentDefaults > 0;
              return (
                <tr className={shift.status === "archived" ? "is-archived" : undefined} key={shift.id}>
                  <td>
                    <span className="shift-code" style={{ background: shift.color ?? "#64748b" }}>{shift.code}</span>
                  </td>
                  <td>
                    {shift.name}
                    {shift.usage.companyDefault ? <small className="shift-tag">Mặc định công ty</small> : null}
                    {shift.usage.departmentDefaults > 0 ? <small className="shift-tag">Mặc định {shift.usage.departmentDefaults} phòng ban</small> : null}
                    {shift.status === "archived" ? <small className="shift-tag is-muted">Đã lưu trữ</small> : null}
                  </td>
                  <td>
                    {shift.type === "flexible" ? `Linh hoạt trong ${timeRange(shift)}` : timeRange(shift)}
                    {shift.endMinute <= shift.startMinute ? <small className="shift-tag">Qua đêm</small> : null}
                  </td>
                  <td>{shift.breakStartMinute !== null ? `${minuteToTime(shift.breakStartMinute)}–${minuteToTime(shift.breakEndMinute)}` : "--"}</td>
                  <td>{hours(shift.requiredMinutes)}</td>
                  <td>{shift.workUnits}</td>
                  <td>
                    {shift.lateGraceMinutes ?? data.policy.lateGraceMinutes} / {shift.earlyGraceMinutes ?? data.policy.earlyGraceMinutes} phút
                    {shift.lateGraceMinutes === null && shift.earlyGraceMinutes === null ? <small className="shift-tag is-muted">Theo chính sách</small> : null}
                  </td>
                  <td className="shift-actions">
                    {shift.status === "active" ? (
                      <>
                        <button disabled={isPending} type="button" onClick={() => setEditing(shift)}>Sửa</button>
                        <button disabled={isPending || isDefault} title={isDefault ? "Đang là ca mặc định" : undefined} type="button" onClick={() => run(() => archiveShiftAction(shift.id))}>
                          Lưu trữ
                        </button>
                      </>
                    ) : (
                      <button disabled={isPending} type="button" onClick={() => run(() => restoreShiftAction(shift.id))}>Khôi phục</button>
                    )}
                    <button
                      disabled={isPending || isDefault || shift.usage.assignments > 0}
                      title={shift.usage.assignments > 0 ? "Ca đã được xếp cho nhân sự, hãy lưu trữ" : undefined}
                      type="button"
                      onClick={() => remove(shift)}
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing ? <ShiftDialog policy={data.policy} shift={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </section>
  );
}
