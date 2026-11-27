"use client";

import { useState } from "react";
import { CollapseButton } from "@/components/user/collapse-button";
import { RequestFormFooter, today, useRequestSave } from "@/components/user/request-form-parts";
import { Plus, X } from "@/lib/icons";
import { formatHours, type AbsencePayload, type RequestDetail } from "@/lib/request-format";

type Row = { key: number; date: string; fromTime: string; toTime: string };

const minutesOf = (row: Row) => {
  if (!row.fromTime || !row.toTime) return 0;
  const [fh, fm] = row.fromTime.split(":").map(Number);
  const [th, tm] = row.toTime.split(":").map(Number);
  return Math.max(0, th * 60 + tm - (fh * 60 + fm));
};

// LV-17: time out during working hours. Company business counts as worked; personal time out
// comes off the hours worked. Lateness / leaving early inside the approved time is not a violation.
export function AbsenceRequestCreateBoard({ request, loadError }: { request?: RequestDetail | null; loadError?: string }) {
  const initial = request?.payload as Partial<AbsencePayload> | undefined;
  const [kind, setKind] = useState<"company" | "personal">(initial?.kind ?? "personal");
  const [rows, setRows] = useState<Row[]>(
    initial?.ranges?.length ? initial.ranges.map((range, index) => ({ key: index, ...range })) : [{ key: 0, date: today(), fromTime: "", toTime: "" }]
  );
  const [reason, setReason] = useState(initial?.reason ?? "");
  const { save, saving, error, setError } = useRequestSave("absence", request, loadError);
  const total = rows.reduce((sum, row) => sum + minutesOf(row), 0);

  const update = (key: number, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const send = (submit: boolean) => {
    const ranges = rows.filter((row) => row.date && row.fromTime && row.toTime).map(({ date, fromTime, toTime }) => ({ date, fromTime, toTime }));
    if (ranges.length === 0) return setError("Hãy nhập ít nhất một khoảng vắng mặt (ngày, từ giờ, đến giờ).");
    save({ kind, ranges, reason: reason.trim() || undefined }, submit);
  };

  return (
    <main className="leave-create-page" aria-label={request ? `Sửa đơn ${request.code}` : "Tạo mới đơn vắng mặt"}>
      <form
        className="leave-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          send(true);
        }}
      >
        <section className="leave-create-section" aria-labelledby="absence-general-title">
          <header className="leave-create-section-header">
            <CollapseButton className="leave-create-collapse" label="Thông tin chung" />
            <h2 id="absence-general-title">{request ? `Đơn ${request.code}` : "Thông tin chung"}</h2>
          </header>

          <div className="leave-create-grid leave-create-grid--summary">
            <label className="leave-field leave-field--wide">
              <span>
                Loại vắng mặt <strong>*</strong>
              </span>
              <select className="leave-control" value={kind} onChange={(event) => setKind(event.target.value as "company" | "personal")}>
                <option value="personal">Việc riêng (không tính công)</option>
                <option value="company">Việc công ty (tính công)</option>
              </select>
            </label>
            <label className="leave-field leave-field--readonly">
              <span>Tổng thời gian</span>
              <input value={formatHours(Math.round((total / 60) * 100) / 100)} readOnly />
            </label>
          </div>

          {rows.map((row, index) => (
            <div className="leave-create-grid leave-create-grid--time" key={row.key}>
              <label className="leave-field">
                <span>
                  Ngày vắng mặt <strong>*</strong>
                </span>
                <input type="date" value={row.date} onChange={(event) => update(row.key, { date: event.target.value })} aria-label={`Ngày vắng mặt, dòng ${index + 1}`} required />
              </label>
              <label className="leave-field">
                <span>
                  Từ giờ <strong>*</strong>
                </span>
                <input type="time" value={row.fromTime} onChange={(event) => update(row.key, { fromTime: event.target.value })} aria-label={`Vắng mặt từ, dòng ${index + 1}`} required />
              </label>
              <label className="leave-field">
                <span>
                  Đến giờ <strong>*</strong>
                </span>
                <input type="time" value={row.toTime} onChange={(event) => update(row.key, { toTime: event.target.value })} aria-label={`Vắng mặt đến, dòng ${index + 1}`} required />
              </label>
              <label className="leave-field leave-field--readonly">
                <span>Thời gian</span>
                <input value={minutesOf(row) ? formatHours(Math.round((minutesOf(row) / 60) * 100) / 100) : ""} readOnly aria-label={`Thời gian vắng mặt, dòng ${index + 1}`} />
              </label>
              <button
                className="icon-button leave-row-remove"
                type="button"
                aria-label={`Xoá dòng vắng mặt ${index + 1}`}
                disabled={rows.length === 1}
                onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
              >
                <X size={18} weight="duotone" aria-hidden="true" />
              </button>
            </div>
          ))}

          <button
            className="leave-add-time"
            type="button"
            aria-label="Thêm dòng vắng mặt"
            disabled={rows.length >= 10}
            onClick={() => setRows((current) => [...current, { key: Math.max(...current.map((row) => row.key)) + 1, date: current.at(-1)?.date ?? today(), fromTime: "", toTime: "" }])}
          >
            <Plus size={18} weight="duotone" aria-hidden="true" />
          </button>
          <p className="leave-type-hint">Mỗi dòng là một lần ra ngoài trong ca, trong cùng một ngày. Muốn nghỉ cả buổi thì dùng đơn xin nghỉ.</p>

          <label className="leave-field leave-description">
            <span>Lý do / mô tả</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={5000} placeholder="Nhập lý do vắng mặt" aria-label="Nhập mô tả đơn vắng mặt" />
          </label>
        </section>

        <RequestFormFooter saving={saving} onDraft={() => send(false)} request={request} error={error} />
      </form>
    </main>
  );
}
