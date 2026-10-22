"use client";

import { useCallback, useState, useTransition, type CSSProperties } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StateBlock } from "@/components/ui/primitives";
import { AttendanceDayDrawer, STATUS_LABELS } from "@/components/attendance/attendance-day-drawer";
import type { TimesheetCell, TimesheetData } from "@/lib/timesheet-api";
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

type Props = { data: TimesheetData; canEdit: boolean; departmentId: string; q: string };

// AT-16: monthly timesheet for the people in the viewer's scope (Công → Bảng chấm công).
export function TimesheetBoard({ data, canEdit, departmentId, q }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [display, setDisplay] = useState<Display>("hours");
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [search, setSearch] = useState(q);
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
  const [year, monthNumber] = sheet.month.split("-").map(Number);
  const first = (sheet.page - 1) * sheet.limit + 1;
  const last = Math.min(sheet.total, sheet.page * sheet.limit);

  return (
    <section className="timesheet" aria-labelledby="timesheet-title">
      <header className="timesheet-toolbar">
        <h1 id="timesheet-title">
          Bảng chấm công tháng {monthNumber}/{year}
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
        <div className="timesheet-display" role="group" aria-label="Hiển thị ô ngày">
          <button aria-pressed={display === "hours"} className={display === "hours" ? "is-active" : undefined} type="button" onClick={() => setDisplay("hours")}>
            Giờ
          </button>
          <button aria-pressed={display === "units"} className={display === "units" ? "is-active" : undefined} type="button" onClick={() => setDisplay("units")}>
            Công
          </button>
        </div>
      </header>

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
                <td className="timesheet-total">{units(row.totals.standardUnits)}</td>
                <td className="timesheet-total">{row.totals.workedHours}</td>
                <td className="timesheet-total is-strong">{units(row.totals.totalUnits)}</td>
              </tr>
            ))}
            {sheet.items.length === 0 ? (
              <tr>
                <td className="timesheet-empty" colSpan={sheet.dates.length + 17}>
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

      {openDay ? <AttendanceDayDrawer canEdit={canEdit} dayId={openDay} onChanged={refresh} onClose={closeDrawer} /> : null}
    </section>
  );
}
