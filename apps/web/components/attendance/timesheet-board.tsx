"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModalDialog, StateBlock } from "@/components/ui/primitives";
import { ExportStatus, useServerExport } from "@/components/ui/use-server-export";
import { AttendanceDayDrawer, STATUS_LABELS } from "@/components/attendance/attendance-day-drawer";
import { lockPeriodAction, resolveFeedbackAction, setConfirmationWindowAction, unlockPeriodAction } from "@/lib/attendance-actions";
import type { AttendancePeriod, TimesheetCell, TimesheetData, TimesheetRow } from "@/lib/timesheet-api";
import { CaretLeft, CaretRight } from "@/lib/icons";

const WEEKDAY_LABELS = ["", "T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const VIOLATIONS = new Set(["late", "early_leave", "late_and_early", "missing_checkin", "missing_checkout"]);

function hours(minutes: number) {
  const value = minutes / 60;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function units(value: number) {
  return String(Number(value.toFixed(2)));
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function vnTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "--:--";
}

type Display = "hours" | "units";

// What a day cell shows, like 1Office: hours (or units) worked, a small V for a violation and S
// for a manual change; N without a shift, L on a holiday, ✕ when absent.
function cellContent(cell: TimesheetCell, display: Display, isFuture: boolean) {
  if (cell.status === null) {
    if (!cell.shiftCode) return { text: "N", tone: "muted" };
    return { text: isFuture ? "" : "–", tone: "muted" };
  }
  if (cell.status === "holiday") return { text: "L", tone: "info" };
  if (cell.status === "day_off") {
    return cell.outsideShiftMinutes > 0 ? { text: display === "hours" ? hours(cell.outsideShiftMinutes) : "0", tone: "info" } : { text: "N", tone: "muted" };
  }
  if (cell.status === "absent") return { text: "✕", tone: "danger" };
  const value = display === "hours" ? hours(cell.workedMinutes) : units(cell.workUnits);
  const missing = cell.status === "missing_checkin" || cell.status === "missing_checkout";
  return { text: value, tone: missing ? "danger" : "normal" };
}

function cellTitle(cell: TimesheetCell, date: string) {
  const parts = [date.split("-").reverse().join("/")];
  if (cell.shiftCode) parts.push(`Ca ${cell.shiftCode}`);
  if (cell.status) parts.push(STATUS_LABELS[cell.status]);
  if (cell.checkIn || cell.checkOut) parts.push(`${vnTime(cell.checkIn)}–${vnTime(cell.checkOut)}`);
  if (cell.lateMinutes) parts.push(`muộn ${cell.lateMinutes}'`);
  if (cell.earlyMinutes) parts.push(`sớm ${cell.earlyMinutes}'`);
  if (cell.adjusted) parts.push("đã sửa tay");
  return parts.join(" · ");
}

function vnDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", hour12: false }).format(new Date(value));
}

// AT-17: confirm locking (with what is still open on this page) or reopening (reason required).
function PeriodDialog({ mode, month, rows, onClose, onDone }: { mode: "lock" | "unlock"; month: string; rows: TimesheetRow[]; onClose: () => void; onDone: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const label = `${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;
  const absent = rows.reduce((total, row) => total + row.totals.absentDays, 0);
  const missing = rows.reduce((total, row) => total + row.totals.missingPunchCount, 0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    const result = mode === "lock" ? await lockPeriodAction(month, text) : await unlockPeriodAction(month, text);
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
    onClose();
  };

  return (
    <ModalDialog className="shift-dialog" ref={dialogRef} title={mode === "lock" ? `Chốt kỳ công tháng ${label}` : `Mở chốt kỳ công tháng ${label}`} onCloseRequest={onClose} onCancel={onClose}>
      <div className="account-dialog-form">
        {mode === "lock" ? (
          <>
            <p className="timesheet-period-text">
              Sau khi chốt, công của tháng {label} không sửa tay, không xếp ca và không tính lại được nữa; dữ liệu này dùng để tính lương.
            </p>
            {absent > 0 || missing > 0 ? (
              <p className="timesheet-period-warning">
                Trên trang đang xem còn {absent} ngày vắng và {missing} lần quên chấm chưa xử lý.
              </p>
            ) : null}
          </>
        ) : (
          <p className="timesheet-period-text">Mở chốt cho phép sửa công, xếp ca và tính lại trong tháng {label}. Hành động được ghi nhật ký.</p>
        )}
        <label className="account-dialog-field">
          <span>{mode === "lock" ? "Ghi chú (không bắt buộc)" : "Lý do mở chốt (bắt buộc)"}</span>
          <textarea maxLength={500} rows={2} value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
        <div className="account-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            HỦY BỎ
          </button>
          <button className="primary-button" disabled={isSaving || (mode === "unlock" && text.trim().length < 3)} type="button" onClick={submit}>
            {isSaving ? "ĐANG XỬ LÝ..." : mode === "lock" ? "CHỐT CÔNG" : "MỞ CHỐT"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

// AT-24: one person's feedback on the month and HR's handling of it.
function FeedbackDialog({ month, row, onClose, onDone }: { month: string; row: TimesheetRow; onClose: () => void; onDone: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const answer = row.confirmation!;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    const result = await resolveFeedbackAction(month, row.employee.id, resolution);
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
    onClose();
  };

  return (
    <ModalDialog className="shift-dialog" ref={dialogRef} title={`Phản hồi của ${row.employee.fullName}`} onCloseRequest={onClose} onCancel={onClose}>
      <div className="account-dialog-form">
        <blockquote className="timesheet-feedback-quote">
          {answer.feedback}
          <small>{vnDateTime(answer.respondedAt)}</small>
        </blockquote>
        {answer.resolvedAt ? (
          <p className="timesheet-period-text">
            Đã xử lý{answer.resolvedBy ? ` bởi ${answer.resolvedBy}` : ""} lúc {vnDateTime(answer.resolvedAt)}: {answer.resolution}
          </p>
        ) : (
          <>
            <p className="timesheet-period-text">Sửa công các ngày liên quan (bấm vào ô trên bảng) rồi ghi lại cách đã xử lý để nhân viên biết.</p>
            <label className="account-dialog-field">
              <span>Cách đã xử lý</span>
              <textarea maxLength={1000} rows={2} value={resolution} onChange={(event) => setResolution(event.target.value)} />
            </label>
          </>
        )}
        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
        <div className="account-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            ĐÓNG
          </button>
          {answer.resolvedAt ? null : (
            <button className="primary-button" disabled={isSaving || resolution.trim().length < 3} type="button" onClick={submit}>
              {isSaving ? "ĐANG LƯU..." : "ĐÃ XỬ LÝ"}
            </button>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}

function ConfirmationBadge({ row, onOpen }: { row: TimesheetRow; onOpen: () => void }) {
  const answer = row.confirmation;
  if (!answer) return <span className="timesheet-confirm is-pending">Chưa</span>;
  if (answer.status === "confirmed") return <span className="timesheet-confirm is-confirmed">Đã xác nhận</span>;
  return (
    <button className={answer.resolvedAt ? "timesheet-confirm is-resolved" : "timesheet-confirm is-feedback"} title={answer.feedback ?? undefined} type="button" onClick={onOpen}>
      {answer.resolvedAt ? "Đã xử lý" : "Phản hồi"}
    </button>
  );
}

function PeriodBadge({ period }: { period: AttendancePeriod }) {
  return period.status === "locked" ? <span className="timesheet-period is-locked">Đã chốt</span> : <span className="timesheet-period">Đang mở</span>;
}

type Props = { data: TimesheetData; canConfirm: boolean; canEdit: boolean; canLock: boolean; departmentId: string; q: string };

// AT-16: monthly timesheet for the people in the viewer's scope (Công → Bảng chấm công).
export function TimesheetBoard({ data, canConfirm, canEdit, canLock, departmentId, q }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [display, setDisplay] = useState<Display>("hours");
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [search, setSearch] = useState(q);
  const [periodDialog, setPeriodDialog] = useState<"lock" | "unlock" | null>(null);
  const serverExport = useServerExport();
  const [feedbackRow, setFeedbackRow] = useState<TimesheetRow | null>(null);
  const [windowError, setWindowError] = useState<string | null>(null);
  const [isTogglingWindow, setIsTogglingWindow] = useState(false);
  const [isNavigating, startNavigation] = useTransition();

  const navigate = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(changes).forEach(([key, value]) => (value ? params.set(key, value) : params.delete(key)));
      if (!("page" in changes)) params.delete("page");
      startNavigation(() => router.push(`${pathname}?${params.toString()}` as Route, { scroll: false }));
    },
    [pathname, router, searchParams]
  );
  const closeDrawer = useCallback(() => setOpenDay(null), []);
  const refresh = useCallback(() => router.refresh(), [router]);

  if (data.source === "unavailable") {
    return <StateBlock tone="error" title="Chưa tải được bảng chấm công">{data.error}</StateBlock>;
  }

  const { sheet } = data;
  const toggleConfirmation = async () => {
    setWindowError(null);
    setIsTogglingWindow(true);
    const result = await setConfirmationWindowAction(sheet.month, !sheet.period.confirmationOpen);
    setIsTogglingWindow(false);
    if (result.ok) refresh();
    else setWindowError(result.error);
  };
  const [year, monthNumber] = sheet.month.split("-").map(Number);
  const first = (sheet.page - 1) * sheet.limit + 1;
  const last = Math.min(sheet.total, sheet.page * sheet.limit);

  return (
    <section className="timesheet" aria-labelledby="timesheet-title">
      <header className="timesheet-toolbar">
        <h1 id="timesheet-title">
          Bảng chấm công tháng {monthNumber}/{year} <PeriodBadge period={sheet.period} />
        </h1>
        <div className="timesheet-month" role="group" aria-label="Chọn tháng">
          <button aria-label="Tháng trước" disabled={isNavigating} type="button" onClick={() => navigate({ month: shiftMonth(sheet.month, -1) })}>
            <CaretLeft size={16} weight="bold" aria-hidden="true" />
          </button>
          <input aria-label="Tháng" type="month" value={sheet.month} onChange={(event) => event.target.value && navigate({ month: event.target.value })} />
          <button aria-label="Tháng sau" disabled={isNavigating} type="button" onClick={() => navigate({ month: shiftMonth(sheet.month, 1) })}>
            <CaretRight size={16} weight="bold" aria-hidden="true" />
          </button>
        </div>
        <select aria-label="Phòng ban" value={departmentId} onChange={(event) => navigate({ department: event.target.value || null })}>
          <option value="">Tất cả phòng ban</option>
          {data.departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <form
          className="timesheet-search"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: search.trim() || null });
          }}
        >
          <input aria-label="Tìm nhân sự" placeholder="Tìm theo tên hoặc mã" value={search} onChange={(event) => setSearch(event.target.value)} />
        </form>
        {canConfirm && sheet.period.status !== "locked" ? (
          <button className="secondary-button" disabled={isTogglingWindow} type="button" onClick={toggleConfirmation}>
            {sheet.period.confirmationOpen ? "Đóng xác nhận" : "Mở xác nhận công"}
          </button>
        ) : null}
        {canLock ? (
          sheet.period.status === "locked" ? (
            <button className="secondary-button" type="button" onClick={() => setPeriodDialog("unlock")}>
              Mở chốt
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={() => setPeriodDialog("lock")}>
              Chốt công
            </button>
          )
        ) : null}
        <button
          className="secondary-button"
          disabled={serverExport.running}
          type="button"
          onClick={() => serverExport.run("attendance-timesheet", { month: sheet.month, ...(departmentId ? { departmentId } : {}) })}
        >
          {serverExport.running ? "Đang xuất..." : "Xuất Excel"}
        </button>
        <div className="timesheet-display" role="group" aria-label="Hiển thị ô ngày">
          <button aria-pressed={display === "hours"} className={display === "hours" ? "is-active" : undefined} type="button" onClick={() => setDisplay("hours")}>
            Giờ
          </button>
          <button aria-pressed={display === "units"} className={display === "units" ? "is-active" : undefined} type="button" onClick={() => setDisplay("units")}>
            Công
          </button>
        </div>
      </header>

      {sheet.period.confirmationOpen || sheet.confirmations.confirmed + sheet.confirmations.feedback > 0 ? (
        <p className="timesheet-confirm-summary" role="status">
          {sheet.period.confirmationOpen ? "Đang mở xác nhận công. " : "Đã đóng xác nhận công. "}
          Đã xác nhận <strong>{sheet.confirmations.confirmed}/{sheet.confirmations.people}</strong> người · <strong>{sheet.confirmations.feedback}</strong> phản hồi ·{" "}
          {sheet.confirmations.pending} chưa trả lời.
        </p>
      ) : null}
      <ExportStatus state={serverExport.state} onDismiss={serverExport.dismiss} />
      {windowError ? <p className="account-dialog-error" role="alert">{windowError}</p> : null}
      {sheet.period.status === "locked" ? (
        <p className="timesheet-period-banner" role="status">
          Kỳ công đã chốt{sheet.period.lockedAt ? ` lúc ${vnDateTime(sheet.period.lockedAt)}` : ""}
          {sheet.period.lockedBy ? ` bởi ${sheet.period.lockedBy}` : ""}
          {sheet.period.note ? ` · ${sheet.period.note}` : ""}. Không sửa công, xếp ca hay tính lại được trong tháng này.
        </p>
      ) : null}

      <div className={isNavigating ? "timesheet-table-shell is-loading" : "timesheet-table-shell"} tabIndex={0} aria-label="Bảng chấm công có thể cuộn ngang">
        <table className="timesheet-table">
          <thead>
            <tr>
              <th className="timesheet-sticky timesheet-col-index" rowSpan={2} scope="col">
                STT
              </th>
              <th className="timesheet-sticky timesheet-col-code" rowSpan={2} scope="col">
                Mã NV
              </th>
              <th className="timesheet-sticky timesheet-col-name" rowSpan={2} scope="col">
                Họ và tên
              </th>
              <th className="timesheet-col-department" rowSpan={2} scope="col">
                Phòng ban
              </th>
              {sheet.dates.map((item) => (
                <th
                  key={item.date}
                  className={[
                    "timesheet-day-head",
                    item.weekday >= 6 ? "is-weekend" : "",
                    item.holiday && item.holiday.type !== "compensatory_workday" ? "is-holiday" : "",
                    item.date === sheet.today ? "is-today" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  scope="col"
                  title={item.holiday?.name}
                >
                  {WEEKDAY_LABELS[item.weekday]}
                </th>
              ))}
              <th className="timesheet-group" colSpan={2} scope="colgroup">
                Đi muộn
              </th>
              <th className="timesheet-group" colSpan={2} scope="colgroup">
                Về sớm
              </th>
              <th className="timesheet-group" rowSpan={2} scope="col">
                Quên chấm
              </th>
              <th className="timesheet-group" rowSpan={2} scope="col">
                Vắng
              </th>
              <th className="timesheet-group" colSpan={3} scope="colgroup">
                Công chính
              </th>
              <th className="timesheet-group" rowSpan={2} scope="col">
                Giờ ngoài ca
              </th>
              <th className="timesheet-group" rowSpan={2} scope="col">
                Công chuẩn
              </th>
              <th className="timesheet-group" colSpan={2} scope="colgroup">
                Tổng
              </th>
              <th className="timesheet-group" rowSpan={2} scope="col">
                Xác nhận
              </th>
            </tr>
            <tr>
              {sheet.dates.map((item) => (
                <th
                  key={item.date}
                  className={[
                    "timesheet-day-head",
                    item.weekday >= 6 ? "is-weekend" : "",
                    item.holiday && item.holiday.type !== "compensatory_workday" ? "is-holiday" : "",
                    item.date === sheet.today ? "is-today" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  scope="col"
                >
                  {item.date.slice(8)}
                </th>
              ))}
              <th scope="col">Lần</th>
              <th scope="col">Phút</th>
              <th scope="col">Lần</th>
              <th scope="col">Phút</th>
              <th scope="col">Công ca</th>
              <th scope="col">Công lễ</th>
              <th scope="col">Giờ đêm</th>
              <th scope="col">Giờ</th>
              <th scope="col">Công</th>
            </tr>
          </thead>
          <tbody>
            {sheet.items.map((row, rowIndex) => (
              <tr key={row.employee.id}>
                <td className="timesheet-sticky timesheet-col-index">{first + rowIndex}</td>
                <td className="timesheet-sticky timesheet-col-code">{row.employee.code}</td>
                <th className="timesheet-sticky timesheet-col-name" scope="row">
                  {row.employee.fullName}
                </th>
                <td className="timesheet-col-department">{row.employee.department.name}</td>
                {row.cells.map((cell, index) => {
                  const meta = sheet.dates[index];
                  const content = cellContent(cell, display, cell.date > sheet.today);
                  const classes = [
                    "timesheet-cell",
                    `is-${content.tone}`,
                    meta.weekday >= 6 ? "is-weekend" : "",
                    meta.holiday && meta.holiday.type !== "compensatory_workday" ? "is-holiday" : "",
                    cell.date === sheet.today ? "is-today" : ""
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <td key={cell.date} className={classes}>
                      {cell.id ? (
                        <button type="button" title={cellTitle(cell, cell.date)} onClick={() => setOpenDay(cell.id)}>
                          {content.text}
                          {cell.status && VIOLATIONS.has(cell.status) ? <sup className="timesheet-flag is-violation">V</sup> : null}
                          {cell.adjusted ? <sup className="timesheet-flag is-adjusted">S</sup> : null}
                        </button>
                      ) : (
                        <span title={cellTitle(cell, cell.date)} style={cell.shiftColor && content.text === "" ? ({ "--shift-color": cell.shiftColor } as CSSProperties) : undefined}>
                          {content.text}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="timesheet-total">{row.totals.lateCount || ""}</td>
                <td className="timesheet-total">{row.totals.lateMinutes || ""}</td>
                <td className="timesheet-total">{row.totals.earlyCount || ""}</td>
                <td className="timesheet-total">{row.totals.earlyMinutes || ""}</td>
                <td className="timesheet-total">{row.totals.missingPunchCount || ""}</td>
                <td className="timesheet-total">{row.totals.absentDays || ""}</td>
                <td className="timesheet-total">{units(row.totals.shiftUnits)}</td>
                <td className="timesheet-total">{row.totals.holidayUnits ? units(row.totals.holidayUnits) : ""}</td>
                <td className="timesheet-total">{row.totals.nightHours || ""}</td>
                <td className="timesheet-total">{row.totals.outsideHours || ""}</td>
                <td
                  className="timesheet-total"
                  title={row.totals.standardMode === "schedule" ? `Theo lịch ca${row.totals.standardRule ? ` (nhóm ${row.totals.standardRule})` : ""}` : `Nhóm ${row.totals.standardRule}: ${row.totals.standardMode === "auto" ? "số ngày trong tháng trừ Chủ nhật" : "số cố định"}`}
                >
                  {units(row.totals.standardUnits)}
                </td>
                <td className="timesheet-total">{row.totals.workedHours}</td>
                <td className="timesheet-total is-strong">{units(row.totals.totalUnits)}</td>
                <td className="timesheet-total">
                  <ConfirmationBadge row={row} onOpen={() => setFeedbackRow(row)} />
                </td>
              </tr>
            ))}
            {sheet.items.length === 0 ? (
              <tr>
                <td className="timesheet-empty" colSpan={sheet.dates.length + 18}>
                  Không có nhân sự nào phù hợp trong phạm vi của bạn.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <footer className="timesheet-footer">
        <div className="timesheet-legend" aria-label="Chú thích">
          <span>
            <strong>8</strong> giờ làm (hoặc số công)
          </span>
          <span>
            <sup className="timesheet-flag is-violation">V</sup> đi muộn / về sớm / thiếu chấm
          </span>
          <span>
            <sup className="timesheet-flag is-adjusted">S</sup> HR đã sửa tay
          </span>
          <span>
            <strong className="is-danger">✕</strong> vắng
          </span>
          <span>
            <strong>N</strong> không có ca
          </span>
          <span>
            <strong className="is-info">L</strong> nghỉ lễ
          </span>
          <span>Bấm vào ô để xem chi tiết{canEdit ? " và sửa công" : ""}.</span>
        </div>
        <div className="timesheet-pages">
          <span>{sheet.total > 0 ? `${first}–${last} / ${sheet.total} người` : "0 người"}</span>
          <button disabled={sheet.page <= 1 || isNavigating} type="button" onClick={() => navigate({ page: String(sheet.page - 1) })}>
            ‹ Trước
          </button>
          <button disabled={sheet.page >= sheet.pageCount || isNavigating} type="button" onClick={() => navigate({ page: String(sheet.page + 1) })}>
            Sau ›
          </button>
        </div>
      </footer>

      {openDay ? <AttendanceDayDrawer canEdit={canEdit} dayId={openDay} locked={sheet.period.status === "locked"} onChanged={refresh} onClose={closeDrawer} /> : null}
      {feedbackRow ? <FeedbackDialog month={sheet.month} row={feedbackRow} onClose={() => setFeedbackRow(null)} onDone={refresh} /> : null}
      {periodDialog ? <PeriodDialog mode={periodDialog} month={sheet.month} rows={sheet.items} onClose={() => setPeriodDialog(null)} onDone={refresh} /> : null}
    </section>
  );
}
