"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import {
  adjustAttendanceDayAction,
  loadAttendanceDayAction,
  revokeAttendanceAdjustmentAction,
  type AdjustAttendancePayload,
  type AttendanceDayDetail
} from "@/lib/attendance-actions";
import type { AttendanceDayStatus } from "@/lib/attendance-api";
import { X } from "@/lib/icons";

export const STATUS_LABELS: Record<AttendanceDayStatus, string> = {
  on_time: "Đúng giờ",
  late: "Đi muộn",
  early_leave: "Về sớm",
  late_and_early: "Đi muộn, về sớm",
  missing_checkin: "Thiếu giờ vào",
  missing_checkout: "Thiếu giờ ra",
  absent: "Vắng",
  holiday: "Nghỉ lễ",
  day_off: "Ngày nghỉ"
};

const SOURCE_LABELS: Record<string, string> = { punch_sync: "đồng bộ máy chấm công", recalculation: "tính lại", manual: "HR sửa tay" };
const VIOLATIONS = new Set<AttendanceDayStatus>(["late", "early_leave", "late_and_early", "missing_checkin", "missing_checkout", "absent"]);

const pad = (value: number) => String(value).padStart(2, "0");

function vnParts(value: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}` };
}

function displayDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function minuteToTime(minute: number) {
  return `${pad(Math.floor(minute / 60) % 24)}:${pad(minute % 60)}`;
}

function hours(minutes: number) {
  const value = minutes / 60;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function nextDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

type FormState = { checkIn: string; checkOut: string; checkOutNextDay: boolean; workUnits: string; status: string; reason: string };

function initialForm(detail: AttendanceDayDetail): FormState {
  const checkOut = detail.checkOut ? vnParts(detail.checkOut) : null;
  return {
    checkIn: detail.checkIn ? vnParts(detail.checkIn).time : "",
    checkOut: checkOut?.time ?? "",
    checkOutNextDay: Boolean(checkOut && checkOut.date > detail.workDate),
    workUnits: "",
    status: "",
    reason: ""
  };
}

type Props = {
  dayId: string;
  canEdit: boolean;
  // The day's month is locked (AT-17): it can be read but not changed.
  locked: boolean;
  onClose: () => void;
  // Called after a change so the timesheet reloads.
  onChanged: () => void;
};

// AT-15/AT-16: one day of the monthly timesheet: the result, the raw punches, the history of
// manual changes and, for people allowed to, the form to change it.
export function AttendanceDayDrawer({ dayId, canEdit, locked, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<AttendanceDayDetail | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // The save itself; the timesheet reload that follows (onChanged) does not keep the button busy.
  const [isSaving, setIsSaving] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAttendanceDayAction(dayId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDetail(result.data);
        setForm(initialForm(result.data));
      } else {
        setError(result.error);
      }
    });
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [dayId, onClose]);

  const original = detail ? initialForm(detail) : null;
  const activeAdjustment = detail?.adjustments.find((item) => item.active) ?? null;

  const buildPayload = (): AdjustAttendancePayload | null => {
    if (!detail || !form || !original) return null;
    const payload: AdjustAttendancePayload = { reason: form.reason.trim() };
    if (form.checkIn !== original.checkIn) payload.checkIn = form.checkIn ? `${detail.workDate}T${form.checkIn}` : null;
    if (form.checkOut !== original.checkOut || form.checkOutNextDay !== original.checkOutNextDay) {
      payload.checkOut = form.checkOut ? `${form.checkOutNextDay ? nextDate(detail.workDate) : detail.workDate}T${form.checkOut}` : null;
    }
    if (form.workUnits !== "") payload.workUnits = Number(form.workUnits.replace(",", "."));
    if (form.status !== "") payload.status = form.status as AttendanceDayStatus;
    return Object.keys(payload).length > 1 ? payload : null;
  };
  const payload = buildPayload();

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!payload) return;
    startTransition(async () => {
      setError(null);
      setNotice(null);
      setIsSaving(true);
      const result = await adjustAttendanceDayAction(dayId, payload);
      setIsSaving(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDetail(result.data);
      setForm(initialForm(result.data));
      setNotice("Đã lưu sửa công. Kết quả ngày đã được tính lại.");
      onChanged();
    });
  };

  const revoke = () => {
    if (!window.confirm("Bỏ mọi sửa tay của ngày này và trả về kết quả tính từ log chấm công?")) return;
    startTransition(async () => {
      setError(null);
      setNotice(null);
      setIsSaving(true);
      const result = await revokeAttendanceAdjustmentAction(dayId, form?.reason.trim() || "Bỏ sửa tay");
      setIsSaving(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDetail(result.data);
      setForm(initialForm(result.data));
      setNotice("Đã bỏ sửa tay.");
      onChanged();
    });
  };

  return (
    <div className="timesheet-drawer-layer" role="presentation" onClick={onClose}>
      <aside className="timesheet-drawer" role="dialog" aria-modal="true" aria-labelledby="timesheet-drawer-title" onClick={(event) => event.stopPropagation()}>
        <header className="timesheet-drawer-header">
          <div>
            <h2 id="timesheet-drawer-title">{detail ? detail.employee.fullName : "Chi tiết ngày công"}</h2>
            {detail ? (
              <p>
                {detail.employee.code} · {detail.employee.department.name} · {displayDate(detail.workDate)}
              </p>
            ) : null}
          </div>
          <button ref={closeRef} className="icon-button" type="button" aria-label="Đóng" onClick={onClose}>
            <X size={18} weight="bold" aria-hidden="true" />
          </button>
        </header>

        {!detail ? (
          <p className="timesheet-drawer-empty">{error ?? "Đang tải..."}</p>
        ) : (
          <div className="timesheet-drawer-body">
            <section className="timesheet-drawer-summary">
              <div>
                <span>Giờ vào</span>
                <strong>{detail.checkIn ? vnParts(detail.checkIn).time : "--:--"}</strong>
                {detail.lateMinutes > 0 ? <small className="is-danger">Muộn {detail.lateMinutes} phút</small> : null}
              </div>
              <div>
                <span>Giờ ra</span>
                <strong>{detail.checkOut ? vnParts(detail.checkOut).time : "--:--"}</strong>
                {detail.earlyMinutes > 0 ? <small className="is-danger">Sớm {detail.earlyMinutes} phút</small> : null}
              </div>
              <div>
                <span>Giờ làm</span>
                <strong>{hours(detail.workedMinutes)}</strong>
              </div>
              <div>
                <span>Công</span>
                <strong>{detail.workUnits}</strong>
              </div>
            </section>

            <dl className="timesheet-drawer-facts">
              <div>
                <dt>Trạng thái</dt>
                <dd className={VIOLATIONS.has(detail.status) ? "is-danger" : undefined}>
                  {STATUS_LABELS[detail.status]}
                  {detail.flags.includes("adjusted") ? <span className="timesheet-tag">Đã sửa tay</span> : null}
                  {detail.flags.includes("needs_explanation") ? <span className="timesheet-tag is-warning">Cần giải trình</span> : null}
                </dd>
              </div>
              <div>
                <dt>Ca</dt>
                <dd>
                  {detail.shift
                    ? `${detail.shift.code} — ${detail.shift.name}, ${minuteToTime(detail.shift.startMinute)}–${minuteToTime(detail.shift.endMinute)}`
                    : "Không có ca"}
                </dd>
              </div>
              {detail.outsideShiftMinutes > 0 ? (
                <div>
                  <dt>Giờ ngoài ca</dt>
                  <dd>{hours(detail.outsideShiftMinutes)} giờ</dd>
                </div>
              ) : null}
              {detail.nightMinutes > 0 ? (
                <div>
                  <dt>Giờ làm đêm</dt>
                  <dd>{hours(detail.nightMinutes)} giờ</dd>
                </div>
              ) : null}
              {detail.paidLeaveUnits > 0 ? (
                <div>
                  <dt>Công lễ</dt>
                  <dd>{detail.paidLeaveUnits}</dd>
                </div>
              ) : null}
              <div>
                <dt>Cập nhật</dt>
                <dd>
                  {vnParts(detail.calculatedAt).time} {displayDate(vnParts(detail.calculatedAt).date).slice(0, 5)} · {SOURCE_LABELS[detail.lastChangeSource] ?? detail.lastChangeSource}
                </dd>
              </div>
            </dl>

            <h3>Log chấm công</h3>
            {detail.punches.length > 0 ? (
              <ul className="timesheet-drawer-list">
                {detail.punches.map((punch) => {
                  const local = vnParts(punch.punchTime);
                  return (
                    <li key={punch.punchTime}>
                      <strong>{local.time}</strong>
                      <span>
                        {local.date !== detail.workDate ? `${displayDate(local.date).slice(0, 5)} · ` : ""}
                        {punch.source === "machine"
                          ? `Máy ${punch.deviceId ?? "?"}`
                          : [punch.direction === "in" ? "Vào" : punch.direction === "out" ? "Ra" : null, punch.source === "app" ? "App" : "Web", punch.clientDeviceName, punch.locationName].filter(Boolean).join(" · ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="timesheet-drawer-empty">Không có log chấm trong khung của ca.</p>
            )}

            <h3>Lịch sử sửa công</h3>
            {detail.adjustments.length > 0 ? (
              <ul className="timesheet-drawer-history">
                {detail.adjustments.map((item) => (
                  <li key={item.id} className={item.active ? undefined : "is-revoked"}>
                    <div>
                      <strong>{item.createdBy ?? "Không rõ"}</strong>
                      <span>
                        {vnParts(item.createdAt).time} {displayDate(vnParts(item.createdAt).date)}
                      </span>
                      {item.active ? <span className="timesheet-tag">Đang áp dụng</span> : <span className="timesheet-tag is-muted">Đã thay / bỏ</span>}
                    </div>
                    <p>
                      {[
                        item.punchesSet ? `Vào ${item.checkIn ? vnParts(item.checkIn).time : "--"}, ra ${item.checkOut ? vnParts(item.checkOut).time : "--"}` : null,
                        item.workUnits !== null ? `Công ${item.workUnits}` : null,
                        item.status ? STATUS_LABELS[item.status] : null
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="timesheet-drawer-reason">Lý do: {item.reason}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="timesheet-drawer-empty">Chưa sửa tay lần nào.</p>
            )}

            {canEdit && locked ? <p className="timesheet-drawer-locked">Kỳ công tháng này đã chốt nên không sửa được. Mở chốt kỳ công trước nếu cần sửa.</p> : null}
            {canEdit && !locked && form ? (
              <form className="timesheet-drawer-form" onSubmit={save}>
                <h3>Sửa công</h3>
                <div className="timesheet-drawer-grid">
                  <label className="account-dialog-field">
                    <span>Giờ vào</span>
                    <input type="time" value={form.checkIn} onChange={(event) => setForm({ ...form, checkIn: event.target.value })} />
                  </label>
                  <label className="account-dialog-field">
                    <span>Giờ ra</span>
                    <input type="time" value={form.checkOut} onChange={(event) => setForm({ ...form, checkOut: event.target.value })} />
                  </label>
                  <label className="timesheet-drawer-check">
                    <input checked={form.checkOutNextDay} type="checkbox" onChange={(event) => setForm({ ...form, checkOutNextDay: event.target.checked })} />
                    Giờ ra là ngày hôm sau
                  </label>
                  <label className="account-dialog-field">
                    <span>Số công</span>
                    <input inputMode="decimal" placeholder={`Theo tính toán (${detail.workUnits})`} value={form.workUnits} onChange={(event) => setForm({ ...form, workUnits: event.target.value })} />
                  </label>
                  <label className="account-dialog-field">
                    <span>Trạng thái</span>
                    <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                      <option value="">Theo tính toán ({STATUS_LABELS[detail.status]})</option>
                      {(Object.keys(STATUS_LABELS) as AttendanceDayStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="account-dialog-field">
                  <span>Lý do (bắt buộc)</span>
                  <textarea maxLength={500} rows={2} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
                </label>
                {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
                {notice ? <p className="timesheet-drawer-notice" role="status">{notice}</p> : null}
                <div className="timesheet-drawer-actions">
                  {activeAdjustment ? (
                    <button className="secondary-button" disabled={isSaving} type="button" onClick={revoke}>
                      Bỏ sửa tay
                    </button>
                  ) : null}
                  <button className="primary-button" disabled={isSaving || !payload || form.reason.trim().length < 3} type="submit">
                    {isSaving ? "Đang lưu..." : "Lưu sửa công"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}
