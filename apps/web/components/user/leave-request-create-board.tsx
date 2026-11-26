"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CollapseButton } from "@/components/user/collapse-button";
import { Check, PaperPlaneTilt, Plus, X } from "@/lib/icons";
import { previewLeaveAction, saveLeaveRequestAction } from "@/lib/request-actions";
import { MIN_UNIT_LABEL, formatDate, formatDays, type LeaveBalance, type LeavePreview, type LeaveRange, type LeaveType, type RequestDetail } from "@/lib/request-format";

type Row = { key: number; fromDate: string; toDate: string; fromTime: string; toTime: string };

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

function toRanges(rows: Row[]): LeaveRange[] {
  return rows
    .filter((row) => row.fromDate && row.toDate)
    .map((row) => ({ fromDate: row.fromDate, toDate: row.toDate, fromTime: row.fromTime || undefined, toTime: row.toTime || undefined }));
}

export type LeaveRequestCreateBoardProps = {
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  // Editing a draft or a returned request.
  request?: RequestDetail | null;
  loadError?: string;
};

// LV-16: the leave form. Days are counted on the server from the shifts worked (preview), so what
// the form shows is what the request will take.
export function LeaveRequestCreateBoard({ leaveTypes, balances, request, loadError }: LeaveRequestCreateBoardProps) {
  const router = useRouter();
  const editing = Boolean(request);
  const initialRows: Row[] = request?.payload.ranges?.length
    ? request.payload.ranges.map((range, index) => ({ key: index, fromDate: range.fromDate, toDate: range.toDate, fromTime: range.fromTime ?? "", toTime: range.toTime ?? "" }))
    : [{ key: 0, fromDate: today(), toDate: today(), fromTime: "", toTime: "" }];
  const [leaveTypeCode, setLeaveTypeCode] = useState(request?.payload.leaveTypeCode ?? leaveTypes[0]?.code ?? "");
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [reason, setReason] = useState(request?.payload.reason ?? "");
  const [preview, setPreview] = useState<LeavePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(loadError ?? null);
  const [saving, startSaving] = useTransition();
  const leaveType = leaveTypes.find((item) => item.code === leaveTypeCode);
  const ranges = useMemo(() => toRanges(rows), [rows]);
  const balance = balances.find((item) => item.leaveType.code === leaveTypeCode);

  useEffect(() => {
    if (!leaveTypeCode || ranges.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await previewLeaveAction({ leaveTypeCode, ranges, requestId: request?.id });
      if (cancelled) return;
      if (result.ok) {
        setPreview(result.data);
        setPreviewError(null);
      } else {
        setPreview(null);
        setPreviewError(result.error);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [leaveTypeCode, ranges, request?.id]);

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        // Moving the start past the end moves the end along.
        if (patch.fromDate && next.toDate < patch.fromDate) next.toDate = patch.fromDate;
        return next;
      })
    );

  const save = (submit: boolean) => {
    setSaveError(null);
    if (!leaveTypeCode) return setSaveError("Hãy chọn loại nghỉ.");
    if (ranges.length === 0) return setSaveError("Hãy nhập ít nhất một khoảng thời gian nghỉ.");
    startSaving(async () => {
      const result = await saveLeaveRequestAction({
        requestId: request?.id,
        version: request?.version,
        payload: { leaveTypeCode, ranges, reason: reason.trim() || undefined },
        followerIds: request?.followers.map((person) => person.id) ?? [],
        submit
      });
      if (!result.ok) return setSaveError(result.error);
      router.push(`/user/requests/detail?id=${result.data.id}` as Route);
    });
  };

  return (
    <main className="leave-create-page" aria-label={editing ? `Sửa đơn ${request?.code}` : "Tạo mới đơn xin nghỉ"}>
      <form
        className="leave-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          save(true);
        }}
      >
        <section className="leave-create-section" aria-labelledby="leave-general-title">
          <header className="leave-create-section-header">
            <CollapseButton className="leave-create-collapse" label="Thông tin chung" />
            <h2 id="leave-general-title">{editing ? `Đơn ${request?.code}` : "Thông tin chung"}</h2>
          </header>

          <div className="leave-create-grid leave-create-grid--summary">
            <label className="leave-field leave-field--wide">
              <span>
                Loại nghỉ <strong>*</strong>
              </span>
              <select className="leave-control" value={leaveTypeCode} onChange={(event) => setLeaveTypeCode(event.target.value)} required>
                {leaveTypes.length === 0 ? <option value="">Chưa có loại nghỉ</option> : null}
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.code}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="leave-field leave-field--readonly">
              <span>Tính công</span>
              <input value={leaveType ? (leaveType.paid ? "Có lương" : "Không lương") : ""} readOnly />
            </label>
          </div>

          {leaveType ? (
            <p className="leave-type-hint">
              Nghỉ tối thiểu: {MIN_UNIT_LABEL[leaveType.minUnit].toLocaleLowerCase("vi")}
              {leaveType.maxDaysPerRequest ? ` · tối đa ${Number(leaveType.maxDaysPerRequest)} ngày mỗi đơn` : ""}
              {leaveType.deductsBalance ? ` · trừ quỹ phép${balance ? ` (còn ${formatDays(balance.available)})` : ""}` : " · không trừ quỹ phép"}
              {leaveType.requiresDocument ? " · cần giấy tờ chứng minh" : ""}
            </p>
          ) : null}

          {rows.map((row, index) => (
            <div className="leave-create-grid leave-create-grid--time" key={row.key}>
              <label className="leave-field">
                <span>
                  Từ ngày <strong>*</strong>
                </span>
                <input type="date" value={row.fromDate} onChange={(event) => updateRow(row.key, { fromDate: event.target.value })} aria-label={`Từ ngày, khoảng ${index + 1}`} required />
              </label>
              <label className="leave-field">
                <span>Từ giờ</span>
                <input type="time" value={row.fromTime} onChange={(event) => updateRow(row.key, { fromTime: event.target.value })} aria-label={`Từ giờ, khoảng ${index + 1}`} />
              </label>
              <label className="leave-field">
                <span>
                  Đến ngày <strong>*</strong>
                </span>
                <input type="date" value={row.toDate} min={row.fromDate} onChange={(event) => updateRow(row.key, { toDate: event.target.value })} aria-label={`Đến ngày, khoảng ${index + 1}`} required />
              </label>
              <label className="leave-field">
                <span>Đến giờ</span>
                <input type="time" value={row.toTime} onChange={(event) => updateRow(row.key, { toTime: event.target.value })} aria-label={`Đến giờ, khoảng ${index + 1}`} />
              </label>
              <button
                className="icon-button leave-row-remove"
                type="button"
                aria-label={`Xoá khoảng thời gian ${index + 1}`}
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
            aria-label="Thêm khoảng thời gian nghỉ"
            disabled={rows.length >= 10}
            onClick={() => setRows((current) => [...current, { key: Math.max(...current.map((row) => row.key)) + 1, fromDate: today(), toDate: today(), fromTime: "", toTime: "" }])}
          >
            <Plus size={18} weight="duotone" aria-hidden="true" />
          </button>
          <p className="leave-type-hint">Để trống giờ là nghỉ cả ngày. Giờ bắt đầu áp cho ngày đầu, giờ kết thúc áp cho ngày cuối của mỗi khoảng.</p>

          <div className="leave-preview" aria-live="polite">
            {previewError ? (
              <p className="leave-preview-error" role="alert">{previewError}</p>
            ) : preview ? (
              <>
                <p>
                  Số ngày nghỉ theo lịch ca: <strong>{formatDays(preview.total)}</strong>
                  {preview.remaining.map((item) => (
                    <span key={item.year}>
                      {" "}
                      · Quỹ phép {item.year}: còn {formatDays(item.available)}, sau đơn này còn <strong>{formatDays(item.afterRequest)}</strong>
                    </span>
                  ))}
                </p>
                <ul className="leave-preview-days">
                  {preview.days.map((day) => (
                    <li key={day.date}>
                      {formatDate(day.date)}: {day.units} công
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Đang tính số ngày nghỉ…</p>
            )}
          </div>

          <label className="leave-field leave-description">
            <span>Lý do / mô tả</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={5000} placeholder="Nhập lý do nghỉ" aria-label="Lý do nghỉ" />
          </label>
        </section>

        {saveError ? (
          <p className="leave-save-error" role="alert">
            {saveError}
          </p>
        ) : null}

        <footer className="leave-create-actionbar">
          <button className="primary-button" type="submit" disabled={saving || Boolean(previewError)}>
            <PaperPlaneTilt size={15} weight="duotone" aria-hidden="true" />
            {saving ? "Đang gửi…" : "Gửi duyệt"}
          </button>
          <button className="secondary-button" type="button" disabled={saving} onClick={() => save(false)}>
            <Check size={15} weight="duotone" aria-hidden="true" />
            Lưu nháp
          </button>
          <Link className="secondary-button" href={(editing ? `/user/requests/detail?id=${request?.id}` : "/user/requests") as Route}>
            Huỷ bỏ
          </Link>
        </footer>
      </form>
    </main>
  );
}
