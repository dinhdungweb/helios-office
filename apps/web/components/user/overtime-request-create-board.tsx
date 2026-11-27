"use client";

import { useState } from "react";
import { CollapseButton } from "@/components/user/collapse-button";
import { RequestFormFooter, today, useDayOptions, useRequestSave } from "@/components/user/request-form-parts";
import { formatHours, shiftLabel, type OvertimePayload, type RequestDetail } from "@/lib/request-format";

function spanMinutes(fromTime: string, toTime: string) {
  if (!fromTime || !toTime) return 0;
  const [fh, fm] = fromTime.split(":").map(Number);
  const [th, tm] = toTime.split(":").map(Number);
  const start = fh * 60 + fm;
  let end = th * 60 + tm;
  if (end <= start) end += 1440;
  return end - start;
}

// LV-18: overtime. Whether it is weekday / day off / holiday overtime comes from the schedule on the
// server; the form shows the shift of the day so the hours can be picked outside it.
export function OvertimeRequestCreateBoard({ request, loadError }: { request?: RequestDetail | null; loadError?: string }) {
  const initial = request?.payload as Partial<OvertimePayload> | undefined;
  const [date, setDate] = useState(initial?.date ?? today());
  const [fromTime, setFromTime] = useState(initial?.fromTime ?? "");
  const [toTime, setToTime] = useState(initial?.toTime ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const { options, error: optionsError } = useDayOptions(date);
  const { save, saving, error, setError } = useRequestSave("overtime", request, loadError);
  const minutes = spanMinutes(fromTime, toTime);

  const dayKind = !options ? "" : options.holiday && options.holiday.type !== "compensatory_workday" ? `Ngày lễ (${options.holiday.name})` : options.shift ? "Ngày thường" : "Ngày nghỉ";

  const send = (submit: boolean) => {
    if (!date || !fromTime || !toTime) return setError("Hãy nhập ngày, giờ bắt đầu và giờ kết thúc làm thêm.");
    save({ date, fromTime, toTime, reason: reason.trim() || undefined }, submit);
  };

  return (
    <main className="leave-create-page" aria-label={request ? `Sửa đơn ${request.code}` : "Tạo mới đơn làm thêm"}>
      <form
        className="leave-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          send(true);
        }}
      >
        <section className="leave-create-section" aria-labelledby="overtime-general-title">
          <header className="leave-create-section-header">
            <CollapseButton className="leave-create-collapse" label="Thông tin chung" />
            <h2 id="overtime-general-title">{request ? `Đơn ${request.code}` : "Thông tin chung"}</h2>
          </header>

          <div className="leave-create-grid leave-create-grid--time">
            <label className="leave-field">
              <span>
                Ngày làm thêm <strong>*</strong>
              </span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Ngày làm thêm" required />
            </label>
            <label className="leave-field">
              <span>
                Từ giờ <strong>*</strong>
              </span>
              <input type="time" value={fromTime} onChange={(event) => setFromTime(event.target.value)} aria-label="Giờ bắt đầu làm thêm" required />
            </label>
            <label className="leave-field">
              <span>
                Đến giờ <strong>*</strong>
              </span>
              <input type="time" value={toTime} onChange={(event) => setToTime(event.target.value)} aria-label="Giờ kết thúc làm thêm" required />
            </label>
            <label className="leave-field leave-field--readonly">
              <span>Số giờ</span>
              <input value={minutes ? formatHours(Math.round((minutes / 60) * 100) / 100) : ""} readOnly aria-label="Số giờ làm thêm" />
            </label>
          </div>

          <div className="leave-create-grid leave-create-grid--summary">
            <label className="leave-field leave-field--readonly leave-field--wide">
              <span>Ca làm việc</span>
              <input value={options?.shift ? shiftLabel(options.shift) : options ? "Không có ca" : ""} readOnly aria-label="Ca làm việc trong ngày" />
            </label>
            <label className="leave-field leave-field--readonly">
              <span>Loại ngày</span>
              <input value={dayKind} readOnly aria-label="Loại ngày làm thêm" />
            </label>
          </div>
          {optionsError ? <p className="leave-preview-error" role="alert">{optionsError}</p> : null}
          <p className="leave-type-hint">Giờ làm thêm phải nằm ngoài giờ ca. Giờ kết thúc nhỏ hơn giờ bắt đầu nghĩa là làm qua nửa đêm.</p>

          <label className="leave-field leave-description">
            <span>Lý do / nội dung công việc</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={5000} placeholder="Nhập lý do làm thêm" aria-label="Ghi chú đơn làm thêm" />
          </label>
        </section>

        <RequestFormFooter saving={saving} onDraft={() => send(false)} request={request} error={error} />
      </form>
    </main>
  );
}
