"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { AttendanceData, AttendanceRecord } from "@/lib/attendance-api";
import {
  CalendarBlank,
  CalendarCheck,
  CaretDown,
  CheckCircle,
  Clock,
  X
} from "@/lib/icons";

type AttendanceDay = {
  day?: string;
  fullDate?: string;
  score?: string;
  scoreTone?: "success" | "danger" | "muted" | "info";
  time?: string;
  shift?: string;
  isEmpty?: boolean;
  isSelected?: boolean;
};

type AttendanceStat = {
  label: string;
  value: string;
};

type AttendanceDetail = {
  fullDate: string;
  checkIn: string;
  checkOut: string;
  plannedTime: string;
  hours: string;
  workday: string;
  statusIn: string;
  statusOut: string;
  fingerprint: string;
};

type AttendanceDetailPosition = {
  top: number;
  left: number;
};

const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const months = Array.from({ length: 12 }, (_, index) => index + 1);

function formatTime(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function recordDateKey(record: AttendanceRecord) {
  const date = new Date(record.workDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildAttendanceDays(year: number, month: number, records: AttendanceRecord[]): AttendanceDay[] {
  const recordMap = new Map(records.map((record) => [recordDateKey(record), record]));
  const firstDate = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const leadingEmptyCells = (firstDate.getDay() + 6) % 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: AttendanceDay[] = Array.from({ length: leadingEmptyCells }, () => ({ isEmpty: true }));

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month - 1, day);
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = recordMap.get(key);
    const checkIn = record ? formatTime(record.checkIn) : null;
    const checkOut = record ? formatTime(record.checkOut) : null;
    const isWeekend = date.getDay() === 0;
    const isFuture = date.getTime() > today.getTime();
    const fullDate = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;

    if (record) {
      days.push({
        day: day === 1 ? `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}` : String(day).padStart(2, "0"),
        fullDate,
        score: checkIn && checkOut ? "8" : "0",
        scoreTone: checkIn && checkOut ? "success" : "info",
        time: checkIn ? `${checkIn} - ${checkOut ?? "--:--"}` : undefined,
        shift: record.source === "machine" ? "Máy chấm công" : "Chấm công ứng dụng"
      });
    } else if (isWeekend) {
      days.push({ day: String(day).padStart(2, "0"), fullDate, score: "N", scoreTone: isFuture ? "muted" : "success" });
    } else {
      days.push({
        day: day === 1 ? `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}` : String(day).padStart(2, "0"),
        fullDate,
        score: isFuture ? "0" : "x",
        scoreTone: isFuture ? "muted" : "danger",
        shift: "Chưa có dữ liệu"
      });
    }
  }

  while (days.length % 7 !== 0) {
    days.push({ isEmpty: true });
  }

  return days;
}

const inactiveAttendanceStats: AttendanceStat[] = [
  { label: "Số lần đi muộn", value: "0" },
  { label: "Số lần về sớm", value: "0" },
  { label: "Số phút đi muộn", value: "0" },
  { label: "Số phút về sớm", value: "0" },
  { label: "Số lần quên check in/out", value: "0" },
  { label: "Giờ làm việc thực tính ban đêm", value: "0" },
  { label: "Công làm thêm", value: "0" },
  { label: "Giờ làm thêm", value: "0" },
  { label: "Công ăn làm thêm", value: "0" },
  { label: "Công ăn theo ca", value: "0" },
  { label: "Công ăn", value: "0" },
  { label: "Tiền phạt đi muộn", value: "0" },
  { label: "Tiền phạt về sớm", value: "0" },
  { label: "Tiền phạt quên check in/out", value: "0" },
  { label: "Công phạt đi muộn", value: "0" },
  { label: "Công phạt về sớm", value: "0" },
  { label: "Công phạt nghỉ không lý do", value: "0" },
  { label: "Công phạt quên check in/out", value: "0" },
  { label: "Công lễ", value: "0" },
  { label: "Công công tác", value: "0" },
  { label: "Giờ làm thêm ban đêm", value: "0" },
  { label: "Giờ làm thêm trong ngày lễ", value: "0" },
  { label: "Giờ làm thêm trong ngày nghỉ tuần", value: "0" },
  { label: "Giờ làm thêm trong ngày đi làm", value: "0" },
  { label: "Làm thêm ngày thường ca ngày", value: "0" },
  { label: "Làm thêm ngày thường ca đêm", value: "0" },
  { label: "Làm thêm ngày nghỉ ca ngày", value: "0" },
  { label: "Làm thêm ngày nghỉ ca đêm", value: "0" },
  { label: "Làm thêm ngày lễ ca ngày", value: "0" },
  { label: "Làm thêm ngày lễ ca đêm", value: "0" },
  { label: "Số công tăng ca", value: "" },
  { label: "Số giờ tăng ca", value: "" },
  { label: "Số công nghỉ phép", value: "0" }
];

function getAttendanceDetail(day: AttendanceDay): AttendanceDetail {
  const fullDate = day.fullDate ?? day.day ?? "--";
  const [checkIn = "--", checkOut = "--"] = day.time?.split(" - ") ?? [];
  const isUnexcusedAbsence = day.score === "x";
  const isCurrentUnchecked = day.score === "0" && day.scoreTone === "info";
  const isFutureUnarrived = day.score === "0" && day.scoreTone === "muted";
  const isMissingAttendance = isUnexcusedAbsence || isCurrentUnchecked || isFutureUnarrived;
  const hasTimeLogs = Boolean(day.time) && day.score !== "N" && !isMissingAttendance;
  const isFullWorkday = day.score === "8";
  const workday = isFullWorkday ? "1" : "0";
  const hours = isFullWorkday ? "8" : "0";

  return {
    fullDate,
    checkIn: isMissingAttendance ? "--:--" : hasTimeLogs ? checkIn : "--",
    checkOut: isMissingAttendance ? "--:--" : hasTimeLogs ? checkOut : "--",
    plannedTime: day.time ?? "8:30 - 18:00",
    hours,
    workday,
    statusIn: hasTimeLogs ? "Đến đúng giờ" : day.score === "N" ? "Nghỉ" : "Chưa có dữ liệu",
    statusOut: hasTimeLogs ? "Về đúng giờ" : day.score === "N" ? "Nghỉ" : "Chưa có dữ liệu",
    fingerprint: hasTimeLogs ? day.time ?? "--" : "--"
  };
}

function AttendanceDayCell({
  day,
  isSelected,
  onSelect
}: {
  day: AttendanceDay;
  isSelected: boolean;
  onSelect: (day: AttendanceDay, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  if (day.isEmpty) {
    return <div className="attendance-month-cell attendance-month-cell--empty" aria-hidden="true" />;
  }

  const shouldReserveScheduleSpace = day.score === "N" && !day.time && !day.shift;

  return (
    <button
      className={isSelected ? "attendance-month-cell is-selected" : "attendance-month-cell"}
      type="button"
      aria-label={`Ngày ${day.day}, công ${day.score}`}
      onClick={(event) => onSelect(day, event)}
    >
      <span className="attendance-day-number">{day.day}</span>
      <strong className={`attendance-day-score attendance-day-score--${day.scoreTone ?? "muted"}`}>
        {day.score === "x" ? <X size={18} weight="bold" aria-label="Nghỉ không lý do" /> : day.score}
      </strong>
      {day.time ? <span className={day.scoreTone === "danger" ? "attendance-day-time is-danger" : "attendance-day-time"}>{day.time}</span> : null}
      {day.shift ? <span className="attendance-day-shift">{day.shift}</span> : null}
      {shouldReserveScheduleSpace ? (
        <>
          <span className="attendance-day-time attendance-day-placeholder" aria-hidden="true">
            8:30 - 18:00
          </span>
          <span className="attendance-day-shift attendance-day-placeholder" aria-hidden="true">
            Office Full SC
          </span>
        </>
      ) : null}
    </button>
  );
}

function AttendanceDetailDialog({
  day,
  onClose,
  position
}: {
  day: AttendanceDay;
  onClose: () => void;
  position: AttendanceDetailPosition;
}) {
  const detail = getAttendanceDetail(day);
  const isUnexcusedAbsence = day.score === "x";
  const isCurrentUnchecked = day.score === "0" && day.scoreTone === "info";
  const isFutureUnarrived = day.score === "0" && day.scoreTone === "muted";
  const isDayOff = day.score === "N";
  const isMissingAttendance = isUnexcusedAbsence || isCurrentUnchecked || isFutureUnarrived;

  return (
    <div className="attendance-detail-layer" role="presentation">
      <section
        className="attendance-detail-dialog"
        style={{ top: position.top, left: position.left }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-detail-title"
      >
        <header className="attendance-detail-header">
          <h2 id="attendance-detail-title">Chấm công, ngày {detail.fullDate}</h2>
          <button className="icon-button" type="button" aria-label="Đóng chi tiết chấm công" onClick={onClose}>
            <X size={18} weight="duotone" aria-hidden="true" />
          </button>
        </header>

        <div className="attendance-detail-summary">
          <article className={isMissingAttendance ? "attendance-detail-card attendance-detail-card--missing" : "attendance-detail-card attendance-detail-card--success"}>
            <span>Giờ vào</span>
            <strong>{detail.checkIn}</strong>
            {isMissingAttendance ? null : <small>{detail.statusIn}</small>}
            {isMissingAttendance ? null : <CheckCircle size={23} weight="duotone" aria-hidden="true" />}
          </article>

          <article className={isMissingAttendance ? "attendance-detail-card attendance-detail-card--missing" : "attendance-detail-card attendance-detail-card--success"}>
            <span>Giờ ra</span>
            <strong>{detail.checkOut}</strong>
            {isMissingAttendance ? null : <small>{detail.statusOut}</small>}
            {isMissingAttendance ? null : <CheckCircle size={23} weight="duotone" aria-hidden="true" />}
          </article>

          <article className="attendance-detail-card attendance-detail-card--workday">
            <span>
              {isMissingAttendance ? null : <Clock size={17} weight="duotone" aria-hidden="true" />}
              {isMissingAttendance ? "-" : `${detail.hours}h`}
            </span>
            <div aria-hidden="true" />
            <strong>{detail.workday}</strong>
          </article>
        </div>

        {isDayOff ? null : <p className="attendance-detail-shift">Ca làm việc {day.shift ?? "Office Full SC"} - Hành chính SC</p>}

        {isDayOff ? null : (
          <dl className="attendance-detail-table">
            <div>
              <dt>Thời gian</dt>
              <dd>{detail.plannedTime}</dd>
            </div>
            <div>
              <dt>Số giờ</dt>
              <dd>{detail.hours}</dd>
            </div>
            <div>
              <dt>Số công</dt>
              <dd>{detail.workday}</dd>
            </div>
            {isMissingAttendance ? null : (
              <div>
                <dt>Chốt vân tay</dt>
                <dd>{detail.fingerprint}</dd>
              </div>
            )}
          </dl>
        )}

        {isDayOff || isFutureUnarrived ? null : isMissingAttendance ? (
          <>
            <p className="attendance-detail-shift">Tiền phạt</p>
            <div className="attendance-detail-logs">
              <p>
                <span>Phạt nghỉ không lý do</span>
                <strong>200,000</strong>
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="attendance-detail-shift">Chốt công trong ngày</p>
            <div className="attendance-detail-logs">
              <p>
                <span>{detail.checkIn}, {detail.fullDate}, Mã máy: VP</span>
                <strong>(máy)</strong>
              </p>
              <p>
                <span>{detail.checkOut}, {detail.fullDate}, Mã máy: VP</span>
                <strong>(máy)</strong>
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function AttendanceStatsPanel({ month, records, year }: { month: number; records: AttendanceRecord[]; year: number }) {
  const [activeStatTab, setActiveStatTab] = useState<"active" | "inactive">("active");
  const monthRecords = records.filter((record) => {
    const date = new Date(record.workDate);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1;
  });
  const actualHours = monthRecords.reduce((total, record) => {
    if (!record.checkIn || !record.checkOut) {
      return total;
    }

    return total + Math.max(0, new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / 3_600_000;
  }, 0);
  const missingCheckoutCount = monthRecords.filter((record) => !record.checkOut).length;
  const generatedStats: AttendanceStat[] = [
    { label: "Công làm việc", value: String(monthRecords.length) },
    { label: "Giờ làm việc thực tính", value: actualHours.toFixed(2) },
    { label: "Số công chuẩn", value: "26" },
    { label: "Số lần quên check in/out", value: String(missingCheckoutCount) },
    { label: "Log từ máy chấm công", value: String(monthRecords.filter((record) => record.source === "machine").length) }
  ];
  const visibleStats = activeStatTab === "active" ? generatedStats : inactiveAttendanceStats;

  return (
    <aside className="attendance-stats-panel" aria-labelledby="attendance-stats-title">
      <header className="attendance-stats-header">
        <h2 id="attendance-stats-title">Thống kê T{String(month).padStart(2, "0")}, {year}</h2>
      </header>

      <div className="attendance-summary-grid">
        <article className="attendance-summary-card">
          <span>
            <CalendarCheck size={18} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p>Công thực tế</p>
            <strong>{monthRecords.length}/26</strong>
          </div>
        </article>
        <article className="attendance-summary-card">
          <span>
            <Clock size={18} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p>Giờ làm thực tế</p>
            <strong>{actualHours.toFixed(1)}/208</strong>
          </div>
        </article>
      </div>

      <div className="attendance-stat-tabs" role="tablist" aria-label="Loại dữ liệu công">
        <button
          className={activeStatTab === "active" ? "is-active" : undefined}
          type="button"
          role="tab"
          aria-selected={activeStatTab === "active"}
          onClick={() => setActiveStatTab("active")}
        >
          Dữ liệu phát sinh
        </button>
        <button
          className={activeStatTab === "inactive" ? "is-active" : undefined}
          type="button"
          role="tab"
          aria-selected={activeStatTab === "inactive"}
          onClick={() => setActiveStatTab("inactive")}
        >
          Dữ liệu không phát sinh
        </button>
      </div>

      <dl className="attendance-stat-list">
        {visibleStats.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export function AttendanceBoard({ data }: { data: AttendanceData }) {
  const calendarPanelRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const [selectedDay, setSelectedDay] = useState<AttendanceDay | null>(null);
  const [detailDay, setDetailDay] = useState<AttendanceDay | null>(null);
  const [detailPosition, setDetailPosition] = useState<AttendanceDetailPosition>({ top: 0, left: 0 });
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const attendanceDaysForMonth = useMemo(
    () => buildAttendanceDays(monthPickerYear, selectedMonth, data.records),
    [data.records, monthPickerYear, selectedMonth]
  );

  useEffect(() => {
    setSelectedDay(null);
    setDetailDay(null);
  }, [monthPickerYear, selectedMonth]);

  function handleSelectDay(day: AttendanceDay, event: MouseEvent<HTMLButtonElement>) {
    const panel = calendarPanelRef.current;

    if (panel) {
      const panelRect = panel.getBoundingClientRect();
      const cellRect = event.currentTarget.getBoundingClientRect();
      const gap = 0;
      const edge = 16;
      const dialogWidth = 524;
      const isDayOff = day.score === "N";
      const isFutureUnarrived = day.score === "0" && day.scoreTone === "muted";
      const isMissingAttendance = day.score === "x" || (day.score === "0" && day.scoreTone === "info");
      const dialogHeight = isDayOff ? 190 : isFutureUnarrived ? 340 : isMissingAttendance ? 420 : 480;
      const rightSideLeft = cellRect.right - panelRect.left + gap;
      const leftSideLeft = cellRect.left - panelRect.left - dialogWidth - gap;
      const hasRightSpace = cellRect.right + gap + dialogWidth <= window.innerWidth - edge;
      const minLeft = edge - panelRect.left;
      const maxLeft = window.innerWidth - edge - dialogWidth - panelRect.left;
      const rawLeft = hasRightSpace ? rightSideLeft : leftSideLeft;
      const rawTop = cellRect.top - panelRect.top - 4;
      const maxTop = window.innerHeight - edge - dialogHeight - panelRect.top;

      setDetailPosition({
        left: Math.max(minLeft, Math.min(rawLeft, maxLeft)),
        top: Math.max(edge - panelRect.top, Math.min(rawTop, maxTop))
      });
    }

    setSelectedDay(day);
    setDetailDay(day);
  }

  return (
    <main className="attendance-board-page" aria-label="Bảng công">
      {data.source === "unavailable" ? (
        <div className="account-api-banner" role="status">
          <strong>Chưa tải được dữ liệu chấm công</strong>
          <span>{data.error}</span>
        </div>
      ) : null}
      <header className="attendance-board-toolbar">
        <div className="attendance-board-tabs" role="tablist" aria-label="Chế độ xem công">
          <button className="is-active" type="button" role="tab" aria-selected="true">
            Bảng công cá nhân
          </button>
          <button type="button" role="tab" aria-selected="false">
            Danh sách
          </button>
        </div>

        <div className="attendance-month-picker">
          <button
            className="attendance-month-select"
            type="button"
            aria-label="Chọn tháng"
            aria-expanded={isMonthPickerOpen}
            onClick={() => setIsMonthPickerOpen((current) => !current)}
          >
            <CalendarBlank size={16} weight="duotone" aria-hidden="true" />
            {String(selectedMonth).padStart(2, "0")}/{monthPickerYear}
            <CaretDown size={14} weight="duotone" aria-hidden="true" />
          </button>

          {isMonthPickerOpen ? (
            <div className="attendance-month-menu" role="dialog" aria-label="Chọn tháng chấm công">
              <header>
                <button type="button" aria-label="Năm trước" onClick={() => setMonthPickerYear((year) => year - 1)}>
                  <CaretDown size={18} weight="duotone" aria-hidden="true" />
                </button>
                <strong>{monthPickerYear}</strong>
                <button type="button" aria-label="Năm sau" onClick={() => setMonthPickerYear((year) => year + 1)}>
                  <CaretDown size={18} weight="duotone" aria-hidden="true" />
                </button>
              </header>

              <div className="attendance-month-grid">
                {months.map((month) => (
                  <button
                    className={month === selectedMonth ? "is-active" : undefined}
                    type="button"
                    key={month}
                    onClick={() => {
                      setSelectedMonth(month);
                      setIsMonthPickerOpen(false);
                    }}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <section className="attendance-board-layout">
        <div className="attendance-calendar-panel" aria-labelledby="attendance-calendar-title" ref={calendarPanelRef}>
          <h2 className="sr-only" id="attendance-calendar-title">
            Bảng công tháng {String(selectedMonth).padStart(2, "0")}/{monthPickerYear}
          </h2>
          <div className="attendance-calendar-grid">
            {weekdays.map((weekday) => (
              <div className="attendance-weekday" key={weekday}>
                {weekday}
              </div>
            ))}
            {attendanceDaysForMonth.map((day, index) => (
              <AttendanceDayCell
                day={day}
                isSelected={selectedDay === day}
                key={`${day.day ?? "empty"}-${index}`}
                onSelect={handleSelectDay}
              />
            ))}
          </div>
          {detailDay ? (
            <AttendanceDetailDialog day={detailDay} onClose={() => setDetailDay(null)} position={detailPosition} />
          ) : null}
        </div>

        <AttendanceStatsPanel month={selectedMonth} records={data.records} year={monthPickerYear} />
      </section>
    </main>
  );
}
