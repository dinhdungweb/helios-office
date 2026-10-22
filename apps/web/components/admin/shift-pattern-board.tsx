"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalDialog, StateBlock } from "@/components/ui/primitives";
import { deleteShiftPatternAction, saveShiftPatternAction, type ShiftActionResult } from "@/lib/shift-actions";
import type { ShiftPatternData, ShiftPatternRecord, ShiftRecord } from "@/lib/shift-format";
import { Plus } from "@/lib/icons";

const MAX_DAYS = 62;

function DayChip({ shift }: { shift: ShiftRecord | undefined }) {
  if (!shift) return <span className="schedule-off is-assigned">Nghỉ</span>;
  return (
    <span className="schedule-shift is-assigned" style={{ "--shift-color": shift.color ?? "#64748b" } as React.CSSProperties} title={shift.name}>
      {shift.code}
    </span>
  );
}

function PatternDialog({ onClose, pattern, shifts }: { onClose: () => void; pattern: ShiftPatternRecord | null; shifts: ShiftRecord[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const activeShifts = shifts.filter((shift) => shift.status === "active");
  const [name, setName] = useState(pattern?.name ?? "");
  const [description, setDescription] = useState(pattern?.description ?? "");
  const [days, setDays] = useState<Array<string | null>>(pattern?.days ?? Array.from({ length: 7 }, (_, index) => (index < 5 ? activeShifts[0]?.id ?? null : null)));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const resize = (length: number) => {
    if (!Number.isInteger(length) || length < 1 || length > MAX_DAYS) return;
    setDays((current) => Array.from({ length }, (_, index) => (index < current.length ? current[index] : current[index % current.length] ?? null)));
  };

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await saveShiftPatternAction(pattern?.id ?? "", { name: name.trim(), days, description: description.trim() || null });
      if (result.ok) {
        router.refresh();
        onClose();
      } else {
        setError(result.error);
      }
    });

  return (
    <ModalDialog className="shift-dialog" ref={dialogRef} title={pattern ? `Sửa mẫu ${pattern.name}` : "Tạo mẫu xếp ca"} onCloseRequest={onClose} onCancel={onClose}>
      <div className="account-dialog-form">
        <div className="shift-dialog-grid">
          <label className="account-dialog-field">
            <span>Tên mẫu</span>
            <input maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="account-dialog-field">
            <span>Số ngày của chu kỳ</span>
            <input max={MAX_DAYS} min={1} type="number" value={days.length} onChange={(event) => resize(Number(event.target.value))} />
          </label>
        </div>
        <p className="shift-catalog-hint">Ngày 1 là ngày bắt đầu xếp; hết chu kỳ thì lặp lại từ ngày 1. Ví dụ chu kỳ 7 ngày bắt đầu thứ 2 thì ngày 6, 7 là thứ 7, chủ nhật.</p>
        <div className="shift-pattern-days" role="group" aria-label="Ca từng ngày của chu kỳ">
          {days.map((day, index) => (
            <label key={index} className="account-dialog-field">
              <span>Ngày {index + 1}</span>
              <select
                value={day ?? ""}
                onChange={(event) => setDays((current) => current.map((value, position) => (position === index ? event.target.value || null : value)))}
              >
                <option value="">Nghỉ</option>
                {activeShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>{shift.code}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <label className="account-dialog-field">
          <span>Ghi chú</span>
          <input maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
        <div className="account-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>HỦY BỎ</button>
          <button className="primary-button" disabled={isPending || !name.trim()} type="button" onClick={save}>{isPending ? "ĐANG LƯU..." : "LƯU"}</button>
        </div>
      </div>
    </ModalDialog>
  );
}

// AT-08: repeating patterns used by bulk scheduling on the HCNS schedule page.
export function ShiftPatternBoard({ data, shifts }: { data: ShiftPatternData; shifts: ShiftRecord[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ShiftPatternRecord | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (data.source === "unavailable") {
    return <StateBlock tone="error" title="Chưa tải được mẫu xếp ca">{data.error}</StateBlock>;
  }

  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));
  const run = (action: () => Promise<ShiftActionResult>) =>
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (result.ok) router.refresh();
      else setMessage(result.error);
    });

  return (
    <section className="personnel-catalog-panel shift-catalog-panel" aria-labelledby="shift-pattern-title">
      <header className="personnel-catalog-header">
        <h2 id="shift-pattern-title">Mẫu xếp ca lặp</h2>
        <div className="personnel-catalog-actions">
          <button type="button" onClick={() => setEditing("new")}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Tạo mẫu
          </button>
        </div>
      </header>
      <p className="shift-catalog-hint">
        Dùng ở <a href="/hcns/shift-schedule">Lịch ca</a> → Xếp ca hàng loạt. Sửa hay xoá mẫu không làm đổi lịch đã xếp.
      </p>
      {message ? <p className="personnel-catalog-message is-error" role="alert">{message}</p> : null}

      <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Bảng mẫu xếp ca có thể cuộn ngang">
        <table className="personnel-catalog-table shift-catalog-table">
          <thead>
            <tr>
              <th scope="col">Tên mẫu</th>
              <th scope="col">Chu kỳ</th>
              <th scope="col">Các ngày</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.patterns.map((pattern) => (
              <tr key={pattern.id}>
                <td>
                  {pattern.name}
                  {pattern.description ? <small className="shift-tag is-muted">{pattern.description}</small> : null}
                </td>
                <td>{pattern.days.length} ngày</td>
                <td>
                  <span className="shift-pattern-preview">
                    {pattern.days.map((day, index) => (
                      <DayChip key={index} shift={day ? shiftsById.get(day) : undefined} />
                    ))}
                  </span>
                </td>
                <td className="shift-actions">
                  <button disabled={isPending} type="button" onClick={() => setEditing(pattern)}>Sửa</button>
                  <button
                    disabled={isPending}
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Xoá mẫu ${pattern.name}?`)) run(() => deleteShiftPatternAction(pattern.id));
                    }}
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
            {data.patterns.length === 0 ? (
              <tr>
                <td colSpan={4}>Chưa có mẫu nào.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? <PatternDialog pattern={editing === "new" ? null : editing} shifts={shifts} onClose={() => setEditing(null)} /> : null}
    </section>
  );
}
