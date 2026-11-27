"use client";

import { useState } from "react";
import { CollapseButton } from "@/components/user/collapse-button";
import { RequestFormFooter, today, useDayOptions, useRequestSave } from "@/components/user/request-form-parts";
import { shiftLabel, type RequestDetail, type ShiftChangePayload } from "@/lib/request-format";

// LV-19: work another shift on a date. Approved, the schedule for that date changes and the day is
// recalculated; HR cancelling the request puts the old shift back.
export function ShiftChangeRequestCreateBoard({ request, loadError }: { request?: RequestDetail | null; loadError?: string }) {
  const initial = request?.payload as Partial<ShiftChangePayload> | undefined;
  const [date, setDate] = useState(initial?.date ?? today());
  const [toShiftId, setToShiftId] = useState(initial?.toShift?.id ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const { options, error: optionsError } = useDayOptions(date);
  const { save, saving, error, setError } = useRequestSave("shift_change", request, loadError);
  const choices = (options?.shifts ?? []).filter((shift) => shift.id !== options?.shift?.id);

  const send = (submit: boolean) => {
    if (!toShiftId) return setError("Hãy chọn ca muốn đổi sang.");
    save({ date, toShiftId, reason: reason.trim() || undefined }, submit);
  };

  return (
    <main className="leave-create-page" aria-label={request ? `Sửa đơn ${request.code}` : "Tạo mới đơn đổi ca"}>
      <form
        className="leave-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          send(true);
        }}
      >
        <section className="leave-create-section" aria-labelledby="shift-change-general-title">
          <header className="leave-create-section-header">
            <CollapseButton className="leave-create-collapse" label="Thông tin chung" />
            <h2 id="shift-change-general-title">{request ? `Đơn ${request.code}` : "Thông tin chung"}</h2>
          </header>

          <div className="leave-create-grid leave-create-grid--summary">
            <label className="leave-field">
              <span>
                Ngày cần đổi <strong>*</strong>
              </span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Ngày cần đổi" required />
            </label>
            <label className="leave-field leave-field--readonly leave-field--wide">
              <span>Ca hiện tại</span>
              <input value={options?.shift ? shiftLabel(options.shift) : options ? "Không có ca (ngày nghỉ)" : ""} readOnly aria-label="Ca hiện tại" />
            </label>
          </div>

          <div className="leave-create-grid leave-create-grid--summary">
            <label className="leave-field leave-field--wide">
              <span>
                Đổi sang ca <strong>*</strong>
              </span>
              <select className="leave-control" value={toShiftId} onChange={(event) => setToShiftId(event.target.value)} aria-label="Ca cần đổi" required>
                <option value="">Chọn ca</option>
                {choices.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shiftLabel(shift)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {optionsError ? <p className="leave-preview-error" role="alert">{optionsError}</p> : null}

          <label className="leave-field leave-description">
            <span>Lý do / mô tả</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={5000} placeholder="Nhập lý do đổi ca" aria-label="Nhập mô tả đơn đổi ca" />
          </label>
        </section>

        <RequestFormFooter saving={saving} onDraft={() => send(false)} request={request} error={error} />
      </form>
    </main>
  );
}
