"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormCheckbox } from "@/components/ui/form-controls";
import { ModalDialog, StateBlock } from "@/components/ui/primitives";
import { addFixedHolidaysAction, deleteHolidayAction, saveHolidayAction, type ShiftActionResult } from "@/lib/shift-actions";
import type { HolidayData, HolidayRecord, HolidayType } from "@/lib/shift-format";
import { Plus } from "@/lib/icons";

const TYPE_LABELS: Record<HolidayType, string> = {
  holiday: "Nghỉ lễ",
  compensatory_workday: "Ngày làm bù",
  company_off: "Công ty nghỉ"
};

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function weekday(date: string) {
  return WEEKDAY_LABELS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

function displayDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function HolidayDialog({ holiday, onClose, year }: { holiday: HolidayRecord | null; onClose: () => void; year: number }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [state, formAction, isPending] = useActionState(saveHolidayAction, null);
  const [type, setType] = useState<HolidayType>(holiday?.type ?? "holiday");

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
    <ModalDialog className="shift-dialog" ref={dialogRef} title={holiday ? "Sửa ngày nghỉ" : "Thêm ngày nghỉ / làm bù"} onCloseRequest={onClose} onCancel={onClose}>
      <form className="account-dialog-form" action={formAction}>
        <input name="holidayId" type="hidden" value={holiday?.id ?? ""} />
        <div className="shift-dialog-grid">
          <label className="account-dialog-field">
            <span>Ngày *</span>
            <input defaultValue={holiday?.date ?? `${year}-01-01`} name="date" required type="date" />
          </label>
          <label className="account-dialog-field">
            <span>Tên *</span>
            <input defaultValue={holiday?.name} minLength={2} name="name" placeholder="VD: Mùng 1 Tết" required />
          </label>
          <label className="account-dialog-field">
            <span>Loại</span>
            <select name="type" value={type} onChange={(event) => setType(event.target.value as HolidayType)}>
              <option value="holiday">{TYPE_LABELS.holiday}</option>
              <option value="company_off">{TYPE_LABELS.company_off}</option>
              <option value="compensatory_workday">{TYPE_LABELS.compensatory_workday} (ngày nghỉ thành ngày đi làm)</option>
            </select>
          </label>
          {type === "compensatory_workday" ? null : (
            <FormCheckbox defaultChecked={holiday?.paid ?? true} label="Hưởng công (tính như ngày làm đủ)" name="paid" />
          )}
        </div>
        <label className="account-dialog-field">
          <span>Ghi chú</span>
          <input defaultValue={holiday?.note ?? ""} maxLength={500} name="note" placeholder="VD: theo Thông báo của Bộ LĐ-TB&XH" />
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

// AT-10: holidays, make-up working days and company days off, one year at a time.
export function HolidaySettingsBoard({ data }: { data: HolidayData }) {
  const router = useRouter();
  const [editing, setEditing] = useState<HolidayRecord | "new" | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<ShiftActionResult>, success?: string) =>
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (result.ok) {
        if (success) setMessage({ text: success, error: false });
        router.refresh();
      } else {
        setMessage({ text: result.error, error: true });
      }
    });

  const remove = (holiday: HolidayRecord) => {
    if (!window.confirm(`Xoá ${holiday.name} (${displayDate(holiday.date)})?`)) return;
    run(() => deleteHolidayAction(holiday.id));
  };

  return (
    <section className="personnel-catalog-panel shift-catalog-panel" aria-labelledby="holiday-page-title">
      <header className="personnel-catalog-header">
        <h2 id="holiday-page-title">Ngày lễ, ngày làm bù</h2>
        <div className="personnel-catalog-actions">
          <nav className="holiday-year-switch" aria-label="Chọn năm">
            <a href={`?year=${data.year - 1}`} aria-label="Năm trước">‹</a>
            <strong>{data.year}</strong>
            <a href={`?year=${data.year + 1}`} aria-label="Năm sau">›</a>
          </nav>
          <button disabled={isPending} type="button" onClick={() => run(() => addFixedHolidaysAction(data.year), `Đã thêm các ngày lễ dương lịch cố định năm ${data.year}.`)}>
            Thêm lễ cố định {data.year}
          </button>
          <button type="button" onClick={() => setEditing("new")}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Thêm ngày
          </button>
        </div>
      </header>

      <p className="shift-catalog-hint">
        Tết Nguyên đán, Giỗ Tổ Hùng Vương và ngày nghỉ liền kề Quốc khánh đổi theo từng năm: nhập theo lịch nghỉ Chính phủ công bố. Ngày làm bù biến một ngày
        nghỉ (ví dụ thứ 7) thành ngày đi làm theo ca mặc định.
      </p>
      {message ? <p className={message.error ? "personnel-catalog-message is-error" : "personnel-catalog-message"} role="status">{message.text}</p> : null}

      {data.source === "unavailable" ? (
        <StateBlock tone="error" title="Chưa kết nối được API chấm công">{data.error}</StateBlock>
      ) : (
        <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Bảng ngày lễ có thể cuộn ngang">
          <table className="personnel-catalog-table shift-catalog-table">
            <thead>
              <tr>
                <th scope="col">Ngày</th>
                <th scope="col">Thứ</th>
                <th scope="col">Tên</th>
                <th scope="col">Loại</th>
                <th scope="col">Hưởng công</th>
                <th scope="col">Ghi chú</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.holidays.map((holiday) => (
                <tr key={holiday.id}>
                  <td>{displayDate(holiday.date)}</td>
                  <td>{weekday(holiday.date)}</td>
                  <td>{holiday.name}</td>
                  <td>{TYPE_LABELS[holiday.type]}</td>
                  <td>{holiday.type === "compensatory_workday" ? "--" : holiday.paid ? "Có" : "Không"}</td>
                  <td>{holiday.note || "--"}</td>
                  <td className="shift-actions">
                    <button disabled={isPending} type="button" onClick={() => setEditing(holiday)}>Sửa</button>
                    <button disabled={isPending} type="button" onClick={() => remove(holiday)}>Xoá</button>
                  </td>
                </tr>
              ))}
              {data.holidays.length === 0 ? (
                <tr>
                  <td colSpan={7}>Chưa có ngày nghỉ nào trong năm {data.year}.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {editing ? <HolidayDialog holiday={editing === "new" ? null : editing} year={data.year} onClose={() => setEditing(null)} /> : null}
    </section>
  );
}
