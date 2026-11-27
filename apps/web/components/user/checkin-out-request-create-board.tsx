"use client";

import { useState } from "react";
import { CollapseButton } from "@/components/user/collapse-button";
import { RequestFormFooter, today, useDayOptions, useRequestSave } from "@/components/user/request-form-parts";
import { formatTime, shiftLabel, type CheckinOutPayload, type RequestDetail } from "@/lib/request-format";

// LV-20: explanation of a missing or wrong check-in / check-out. Approved, the times count as punches
// of that work date and the day is recalculated.
export function CheckinOutRequestCreateBoard({ request, loadError }: { request?: RequestDetail | null; loadError?: string }) {
  const initial = request?.payload as Partial<CheckinOutPayload> | undefined;
  const [date, setDate] = useState(initial?.date ?? today());
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const { options, error: optionsError } = useDayOptions(date);
  const { save, saving, error, setError } = useRequestSave("checkin_out", request, loadError);

  const send = (submit: boolean) => {
    if (!checkIn && !checkOut) return setError("Hãy nhập giờ vào, giờ ra hoặc cả hai cần giải trình.");
    if (!reason.trim()) return setError("Hãy nhập lý do giải trình.");
    save({ date, checkIn: checkIn || undefined, checkOut: checkOut || undefined, reason: reason.trim() }, submit);
  };

  const recorded = options?.recorded;

  return (
    <main className="leave-create-page" aria-label={request ? `Sửa đơn ${request.code}` : "Tạo mới đơn checkin/out"}>
      <form
        className="leave-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          send(true);
        }}
      >
        <section className="leave-create-section" aria-labelledby="checkin-general-title">
          <header className="leave-create-section-header">
            <CollapseButton className="leave-create-collapse" label="Thông tin chung" />
            <h2 id="checkin-general-title">{request ? `Đơn ${request.code}` : "Thông tin chung"}</h2>
          </header>

          <div className="leave-create-grid leave-create-grid--time">
            <label className="leave-field">
              <span>
                Ngày checkin/out <strong>*</strong>
              </span>
              <input type="date" value={date} max={today()} onChange={(event) => setDate(event.target.value)} aria-label="Ngày checkin/out" required />
            </label>
            <label className="leave-field">
              <span>Giờ vào</span>
              <input type="time" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} aria-label="Giờ vào cần giải trình" />
            </label>
            <label className="leave-field">
              <span>Giờ ra</span>
              <input type="time" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} aria-label="Giờ ra cần giải trình" />
            </label>
          </div>

          <div className="leave-create-grid leave-create-grid--summary">
            <label className="leave-field leave-field--readonly leave-field--wide">
              <span>Ca làm việc</span>
              <input value={options?.shift ? shiftLabel(options.shift) : options ? "Không có ca" : ""} readOnly aria-label="Ca làm việc trong ngày" />
            </label>
            <label className="leave-field leave-field--readonly">
              <span>Đã ghi nhận</span>
              <input
                value={recorded ? `Vào ${formatTime(recorded.checkIn) || "—"} · Ra ${formatTime(recorded.checkOut) || "—"}` : options ? "Chưa có dữ liệu công" : ""}
                readOnly
                aria-label="Giờ chấm công đã ghi nhận"
              />
            </label>
          </div>
          {optionsError ? <p className="leave-preview-error" role="alert">{optionsError}</p> : null}
          <p className="leave-type-hint">Chỉ nhập giờ cần bổ sung hoặc sửa. Với ca đêm, giờ ra trước giờ vào ca được tính sang ngày hôm sau.</p>

          <label className="leave-field leave-description">
            <span>
              Lý do <strong>*</strong>
            </span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={5000} placeholder="Ví dụ: quên chấm công, máy chấm công lỗi" aria-label="Nhập mô tả đơn checkin/out" required />
          </label>
        </section>

        <RequestFormFooter saving={saving} onDraft={() => send(false)} request={request} error={error} />
      </form>
    </main>
  );
}
