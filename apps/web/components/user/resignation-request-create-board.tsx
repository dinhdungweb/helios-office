"use client";

import { useState } from "react";
import { CollapseButton } from "@/components/user/collapse-button";
import { RequestFormFooter, today, useRequestSave } from "@/components/user/request-form-parts";
import type { RequestDetail, ResignationPayload } from "@/lib/request-format";

const daysUntil = (date: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86_400_000);

// LV-21: resignation. Approved, the last working day becomes the end date on the profile.
export function ResignationRequestCreateBoard({ request, loadError }: { request?: RequestDetail | null; loadError?: string }) {
  const initial = request?.payload as Partial<ResignationPayload> | undefined;
  const [lastWorkingDate, setLastWorkingDate] = useState(initial?.lastWorkingDate ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [handover, setHandover] = useState(initial?.handover ?? "");
  const { save, saving, error, setError } = useRequestSave("resignation", request, loadError);
  const notice = lastWorkingDate ? daysUntil(lastWorkingDate) : null;

  const send = (submit: boolean) => {
    if (!lastWorkingDate) return setError("Hãy chọn ngày làm việc cuối.");
    if (!reason.trim()) return setError("Hãy nhập lý do thôi việc.");
    save({ lastWorkingDate, reason: reason.trim(), handover: handover.trim() || undefined }, submit);
  };

  return (
    <main className="leave-create-page" aria-label={request ? `Sửa đơn ${request.code}` : "Tạo mới đơn xin thôi việc"}>
      <form
        className="leave-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          send(true);
        }}
      >
        <section className="leave-create-section" aria-labelledby="resignation-general-title">
          <header className="leave-create-section-header">
            <CollapseButton className="leave-create-collapse" label="Thông tin chung" />
            <h2 id="resignation-general-title">{request ? `Đơn ${request.code}` : "Thông tin chung"}</h2>
          </header>

          <div className="leave-create-grid leave-create-grid--summary">
            <label className="leave-field">
              <span>
                Ngày làm việc cuối <strong>*</strong>
              </span>
              <input type="date" value={lastWorkingDate} min={today()} onChange={(event) => setLastWorkingDate(event.target.value)} aria-label="Ngày làm việc cuối" required />
            </label>
            <label className="leave-field leave-field--readonly">
              <span>Báo trước</span>
              <input value={notice === null ? "" : `${notice} ngày`} readOnly aria-label="Số ngày báo trước" />
            </label>
          </div>

          <label className="leave-field leave-description">
            <span>
              Lý do thôi việc <strong>*</strong>
            </span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={5000} placeholder="Lý do thôi việc *" aria-label="Nhập mô tả đơn xin thôi việc" required />
          </label>
          <label className="leave-field leave-description">
            <span>Bàn giao công việc</span>
            <textarea value={handover} onChange={(event) => setHandover(event.target.value)} maxLength={5000} placeholder="Bàn giao những gì, cho ai" aria-label="Nội dung bàn giao" />
          </label>
        </section>

        <RequestFormFooter saving={saving} onDraft={() => send(false)} request={request} error={error} />
      </form>
    </main>
  );
}
