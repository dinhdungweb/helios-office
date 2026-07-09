"use client";

import { useRef, useState, type MouseEvent } from "react";
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

const attendanceDays: AttendanceDay[] = [
  { isEmpty: true },
  { isEmpty: true },
  { day: "01/07", score: "8", scoreTone: "success", time: "8:28 - 18:00", shift: "Office Full SC" },
  { day: "02", score: "8", scoreTone: "success", time: "8:30 - 18:10", shift: "Office Full SC" },
  { day: "03", score: "8", scoreTone: "success", time: "8:23 - 18:01", shift: "Office Full SC" },
  { day: "04", score: "x", scoreTone: "danger", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "05", score: "N", scoreTone: "success" },
  { day: "06", score: "8", scoreTone: "success", time: "8:29 - 18:05", shift: "Office Full SC" },
  { day: "07", score: "8", scoreTone: "success", time: "8:27 - 18:03", shift: "Office Full SC" },
  { day: "08", score: "8", scoreTone: "success", time: "8:30 - 18:03", shift: "Office Full SC" },
  { day: "09", score: "0", scoreTone: "info", time: "8:30 - 18:00", shift: "Office Full SC", isSelected: true },
  { day: "10", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "11", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "12", score: "N", scoreTone: "muted" },
  { day: "13", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "14", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "15", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "16", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "17", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "18", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "19", score: "N", scoreTone: "muted" },
  { day: "20", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "21", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "22", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "23", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "24", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "25", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "26", score: "N", scoreTone: "muted" },
  { day: "27", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "28", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "29", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "30", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { day: "31", score: "0", scoreTone: "muted", time: "8:30 - 18:00", shift: "Office Full SC" },
  { isEmpty: true },
  { isEmpty: true }
];

const attendanceStats: AttendanceStat[] = [
  { label: "Công làm việc", value: "6" },
  { label: "Giờ làm việc thực tính", value: "48" },
  { label: "Số công chuẩn", value: "26" },
  { label: "Số công nghỉ không lý do", value: "2" },
  { label: "Giờ làm việc thực tính ban ngày", value: "47.9925" },
  { label: "Tiền phạt nghỉ không lý do", value: "400,000" },
  { label: "Tiền phạt chấm công", value: "400,000" },
  { label: "Công theo ca", value: "6" }
];

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
  const dateValue = day.day?.includes("/") ? day.day : `${day.day}/07`;
  const fullDate = `${dateValue}/2026`;
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

function AttendanceStatsPanel() {
  const [activeStatTab, setActiveStatTab] = useState<"active" | "inactive">("active");
  const visibleStats = activeStatTab === "active" ? attendanceStats : inactiveAttendanceStats;

  return (
    <aside className="attendance-stats-panel" aria-labelledby="attendance-stats-title">
      <header className="attendance-stats-header">
        <h2 id="attendance-stats-title">Thống kê T07, 2026</h2>
      </header>

      <div className="attendance-summary-grid">
        <article className="attendance-summary-card">
          <span>
            <CalendarCheck size={18} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p>Công thực tế</p>
            <strong>6/26</strong>
          </div>
        </article>
        <article className="attendance-summary-card">
          <span>
            <Clock size={18} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p>Giờ làm thực tế</p>
            <strong>48/208</strong>
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

export function AttendanceBoard() {
  const defaultSelectedDay = attendanceDays.find((day) => day.isSelected && !day.isEmpty) ?? null;
  const calendarPanelRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState<AttendanceDay | null>(defaultSelectedDay);
  const [detailDay, setDetailDay] = useState<AttendanceDay | null>(null);
  const [detailPosition, setDetailPosition] = useState<AttendanceDetailPosition>({ top: 0, left: 0 });
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(7);

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
      <header className="attendance-board-toolbar">
        <div className="attendance-board-tabs" role="tablist" aria-label="Chế độ xem công">
          <button className="is-active" type="button" role="tab" aria-selected="true">
            Bảng công toàn bộ công ty
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
                    className={month === selectedMonth && monthPickerYear === 2026 ? "is-active" : undefined}
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
            Bảng công tháng 07/2026
          </h2>
          <div className="attendance-calendar-grid">
            {weekdays.map((weekday) => (
              <div className="attendance-weekday" key={weekday}>
                {weekday}
              </div>
            ))}
            {attendanceDays.map((day, index) => (
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

        <AttendanceStatsPanel />
      </section>
    </main>
  );
}
