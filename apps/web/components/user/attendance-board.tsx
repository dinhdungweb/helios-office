"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AttendanceData, AttendanceDayResult, AttendanceDayStatus, MonthStandard, MyScheduleData, MyScheduleDay, MyScheduleShift } from "@/lib/attendance-api";
import {
  CalendarBlank,
  CalendarCheck,
  CaretDown,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Clock,
  X
} from "@/lib/icons";

type ScoreTone = "success" | "danger" | "muted" | "info";

type AttendanceDay = {
  isEmpty?: boolean;
  date?: string;
  label?: string;
  fullDate?: string;
  weekday?: string;
  score?: string;
  scoreTone?: ScoreTone;
  // Recorded check-in and check-out, "08:01 - 17:05".
  time?: string;
  // Second line under the score: the shift's hours or a short status.
  caption?: string;
  captionTone?: "danger" | "muted";
  schedule?: MyScheduleDay;
  result?: AttendanceDayResult;
  // Late, early or a missing punch: a small V next to the hours, like 1Office.
  violation?: boolean;
  isToday?: boolean;
  isFuture?: boolean;
};

type AttendanceStat = {
  label: string;
  value: string;
};

type AttendanceDetailPosition = {
  top: number;
  left: number;
};

const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const longWeekdays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const months = Array.from({ length: 12 }, (_, index) => index + 1);
const SOURCE_LABELS: Record<MyScheduleDay["source"], string> = {
  assignment: "Xếp riêng cho bạn",
  department: "Ca mặc định của phòng ban",
  company: "Ca mặc định của công ty",
  none: ""
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function minuteToTime(minute: number) {
  return `${pad(Math.floor(minute / 60) % 24)}:${pad(minute % 60)}`;
}

function shiftHours(shift: MyScheduleShift) {
  return `${minuteToTime(shift.startMinute)} - ${minuteToTime(shift.endMinute)}`;
}

function formatHours(minutes: number) {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

function formatTime(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

function vietnamDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(value);
}

function isDayOffHoliday(schedule: MyScheduleDay | undefined) {
  return Boolean(schedule?.holiday && schedule.holiday.type !== "compensatory_workday");
}

const VIOLATIONS = new Set<AttendanceDayStatus>(["late", "early_leave", "late_and_early", "missing_checkin", "missing_checkout"]);

const STATUS_LABELS: Record<AttendanceDayStatus, string> = {
  on_time: "Đúng giờ",
  late: "Đi muộn",
  early_leave: "Về sớm",
  late_and_early: "Đi muộn, về sớm",
  missing_checkin: "Thiếu giờ vào",
  missing_checkout: "Thiếu giờ ra",
  absent: "Vắng",
  holiday: "Nghỉ lễ",
  day_off: "Ngày nghỉ",
  leave: "Nghỉ phép"
};

const CHANGE_SOURCE_LABELS: Record<string, string> = {
  punch_sync: "có lượt chấm công mới",
  recalculation: "tính lại",
  manual: "HR sửa tay"
};

function violationCaption(result: AttendanceDayResult) {
  const parts: string[] = [];
  if (result.lateMinutes > 0) parts.push(`Muộn ${result.lateMinutes}'`);
  if (result.earlyMinutes > 0) parts.push(`Sớm ${result.earlyMinutes}'`);
  if (result.status === "missing_checkin") parts.push("Thiếu giờ vào");
  if (result.status === "missing_checkout") parts.push("Thiếu giờ ra");
  return parts.join(" · ");
}

function buildAttendanceDays(month: string, results: AttendanceDayResult[], scheduleDays: MyScheduleDay[] | null): AttendanceDay[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const resultMap = new Map(results.map((result) => [result.workDate, result]));
  const scheduleMap = new Map((scheduleDays ?? []).map((day) => [day.date, day]));
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const leadingEmptyCells = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const today = vietnamDate(new Date());
  const days: AttendanceDay[] = Array.from({ length: leadingEmptyCells }, () => ({ isEmpty: true }));

  for (let day = 1; day <= lastDay; day += 1) {
    const date = `${year}-${pad(monthNumber)}-${pad(day)}`;
    const result = resultMap.get(date);
    const schedule = scheduleMap.get(date);
    const shift = schedule?.shift ?? null;
    const isFuture = date > today;
    const checkIn = formatTime(result?.checkIn ?? null);
    const checkOut = formatTime(result?.checkOut ?? null);
    const base: AttendanceDay = {
      date,
      label: day === 1 ? `${pad(day)}/${pad(monthNumber)}` : pad(day),
      fullDate: `${pad(day)}/${pad(monthNumber)}/${year}`,
      weekday: longWeekdays[new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay()],
      schedule,
      result,
      isToday: date === today,
      isFuture,
      caption: shift ? shiftHours(shift) : undefined,
      captionTone: "muted",
      time: checkIn || checkOut ? `${checkIn ?? "--:--"} - ${checkOut ?? "--:--"}` : undefined
    };

    if (result && result.status === "holiday") {
      days.push({ ...base, score: "L", scoreTone: "info", caption: schedule?.holiday?.name ?? "Nghỉ lễ" });
    } else if (result && result.status === "leave") {
      days.push({ ...base, score: "P", scoreTone: "info", caption: "Nghỉ phép (đơn đã duyệt)" });
    } else if (result && result.status === "day_off") {
      const worked = result.outsideShiftMinutes > 0;
      days.push(
        worked
          ? { ...base, score: formatHours(result.outsideShiftMinutes), scoreTone: "success", caption: "Làm ngày nghỉ" }
          : { ...base, score: "N", scoreTone: "muted", caption: "Không có ca" }
      );
    } else if (result && result.status === "absent") {
      days.push(
        base.isToday
          ? { ...base, score: "0", scoreTone: "info" }
          : { ...base, score: "x", scoreTone: "danger", caption: "Vắng", captionTone: "danger" }
      );
    } else if (result) {
      const violation = VIOLATIONS.has(result.status);
      const missing = result.status === "missing_checkin" || result.status === "missing_checkout";
      days.push({
        ...base,
        score: result.workedMinutes > 0 ? formatHours(result.workedMinutes) : "0",
        scoreTone: missing ? "danger" : "success",
        violation,
        caption: violation ? violationCaption(result) : base.caption,
        captionTone: violation ? "danger" : "muted"
      });
    } else if (schedule && !schedule.employed) {
      days.push({ ...base, score: "–", scoreTone: "muted", caption: "Ngoài thời gian làm việc" });
    } else if (isDayOffHoliday(schedule)) {
      days.push({ ...base, score: "L", scoreTone: "info", caption: schedule!.holiday!.name });
    } else if (scheduleDays && !shift) {
      days.push({ ...base, score: "N", scoreTone: "muted", caption: "Không có ca" });
    } else if (!scheduleDays) {
      // No schedule (e.g. an account without an employee profile).
      days.push({ ...base, score: "–", scoreTone: "muted" });
    } else if (isFuture) {
      days.push({ ...base, score: "0", scoreTone: "muted" });
    } else if (base.isToday) {
      days.push({ ...base, score: "0", scoreTone: "info" });
    } else {
      // A past working day not calculated yet.
      days.push({ ...base, score: "x", scoreTone: "danger", caption: "Chưa có công", captionTone: "danger" });
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

function ShiftChip({ shift }: { shift: MyScheduleShift }) {
  return (
    <span className="attendance-shift-chip" style={{ "--shift-color": shift.color ?? "#64748b" } as CSSProperties} title={`${shift.name} ${shiftHours(shift)}`}>
      {shift.code}
    </span>
  );
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

  const shift = day.schedule?.shift ?? null;
  const classes = [
    "attendance-month-cell",
    isSelected ? "is-selected" : "",
    day.isToday ? "is-today" : "",
    day.schedule && !day.schedule.employed ? "is-outside" : "",
    isDayOffHoliday(day.schedule) ? "is-holiday" : ""
  ].filter(Boolean);

  return (
    <button
      className={classes.join(" ")}
      type="button"
      aria-label={`${day.weekday} ${day.fullDate}${shift ? `, ca ${shift.code}` : ""}, công ${day.score}`}
      aria-current={day.isToday ? "date" : undefined}
      onClick={(event) => onSelect(day, event)}
    >
      <span className="attendance-day-head">
        <span className="attendance-day-number">{day.label}</span>
        {shift ? <ShiftChip shift={shift} /> : isDayOffHoliday(day.schedule) ? <span className="attendance-shift-chip is-holiday">Lễ</span> : null}
      </span>
      <strong className={`attendance-day-score attendance-day-score--${day.scoreTone ?? "muted"}`}>
        {day.score === "x" ? <X size={18} weight="bold" aria-label="Không có dữ liệu chấm công" /> : day.score}
        {day.violation ? (
          <sup className="attendance-day-flag" title="Có vi phạm: đi muộn, về sớm hoặc thiếu giờ chấm">
            V
          </sup>
        ) : null}
      </strong>
      <span className="attendance-day-lines">
        {day.time ? <span className="attendance-day-time">{day.time}</span> : null}
        {day.caption ? <span className={day.captionTone === "danger" ? "attendance-day-shift is-danger" : "attendance-day-shift"}>{day.caption}</span> : null}
      </span>
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
  const result = day.result ?? null;
  const schedule = day.schedule;
  const shift = schedule?.shift ?? null;
  const checkIn = formatTime(result?.checkIn ?? null);
  const checkOut = formatTime(result?.checkOut ?? null);
  const inNote = result?.lateMinutes ? `Muộn ${result.lateMinutes} phút` : checkIn ? "Đúng giờ" : null;
  const outNote = result?.earlyMinutes ? `Sớm ${result.earlyMinutes} phút` : checkOut ? "Đúng giờ" : null;
  const cardClass = (value: string | null, late: boolean) =>
    !value ? "attendance-detail-card attendance-detail-card--missing" : late ? "attendance-detail-card attendance-detail-card--late" : "attendance-detail-card attendance-detail-card--success";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          <h2 id="attendance-detail-title">
            {day.weekday}, {day.fullDate}
          </h2>
          <button className="icon-button" type="button" aria-label="Đóng chi tiết chấm công" onClick={onClose}>
            <X size={18} weight="duotone" aria-hidden="true" />
          </button>
        </header>

        <div className="attendance-detail-summary">
          <article className={cardClass(checkIn, Boolean(result?.lateMinutes))}>
            <span>Giờ vào</span>
            <strong>{checkIn ?? "--:--"}</strong>
            {inNote ? <small>{inNote}</small> : null}
            {checkIn && !result?.lateMinutes ? <CheckCircle size={23} weight="duotone" aria-hidden="true" /> : null}
          </article>

          <article className={cardClass(checkOut, Boolean(result?.earlyMinutes))}>
            <span>Giờ ra</span>
            <strong>{checkOut ?? "--:--"}</strong>
            {outNote ? <small>{outNote}</small> : null}
            {checkOut && !result?.earlyMinutes ? <CheckCircle size={23} weight="duotone" aria-hidden="true" /> : null}
          </article>

          <article className="attendance-detail-card attendance-detail-card--workday">
            <span>
              <Clock size={17} weight="duotone" aria-hidden="true" />
              {result && result.workedMinutes > 0 ? `${formatHours(result.workedMinutes)}h` : "-"}
            </span>
            <div aria-hidden="true" />
            <strong>{result ? result.workUnits : 0}</strong>
          </article>
        </div>

        <p className="attendance-detail-shift">Ca làm việc</p>
        {shift ? (
          <>
            <div className="attendance-detail-shift-card">
              <ShiftChip shift={shift} />
              <div>
                <strong>{shift.name}</strong>
                <small>
                  {shift.type === "flexible" ? `Linh hoạt trong ${shiftHours(shift)}` : shiftHours(shift)}
                  {shift.endMinute <= shift.startMinute ? " (qua đêm)" : ""} · {formatHours(shift.requiredMinutes)} giờ · {shift.workUnits} công · {SOURCE_LABELS[schedule!.source]}
                  {schedule!.note ? ` · ${schedule!.note}` : ""}
                </small>
              </div>
            </div>
          </>
        ) : (
          <p className="attendance-detail-empty">
            {schedule && !schedule.employed
              ? "Ngày này nằm ngoài thời gian làm việc của bạn."
              : schedule
                ? "Bạn không có ca làm việc ngày này."
                : "Chưa xem được lịch ca của bạn."}
          </p>
        )}
        {schedule?.holiday ? (
          <p className="attendance-detail-holiday">
            {schedule.holiday.type === "compensatory_workday" ? "Ngày làm bù" : "Ngày nghỉ lễ"}: <strong>{schedule.holiday.name}</strong>
            {schedule.holiday.type !== "compensatory_workday" ? (schedule.holiday.paid ? " · có hưởng công" : " · không hưởng công") : null}
          </p>
        ) : null}

        <p className="attendance-detail-shift">Kết quả tính công</p>
        {result ? (
          <>
            <dl className="attendance-detail-table">
              <div>
                <dt>Trạng thái</dt>
                <dd className={VIOLATIONS.has(result.status) || result.status === "absent" ? "is-danger" : undefined}>{STATUS_LABELS[result.status]}</dd>
              </div>
              {result.lateMinutes > 0 ? (
                <div>
                  <dt>Đi muộn</dt>
                  <dd className="is-danger">{result.lateMinutes} phút</dd>
                </div>
              ) : null}
              {result.earlyMinutes > 0 ? (
                <div>
                  <dt>Về sớm</dt>
                  <dd className="is-danger">{result.earlyMinutes} phút</dd>
                </div>
              ) : null}
              <div>
                <dt>Giờ làm trong ca</dt>
                <dd>{formatHours(result.workedMinutes)} giờ</dd>
              </div>
              {result.outsideShiftMinutes > 0 ? (
                <div>
                  <dt>Giờ ngoài ca</dt>
                  <dd>{formatHours(result.outsideShiftMinutes)} giờ</dd>
                </div>
              ) : null}
              {result.nightMinutes > 0 ? (
                <div>
                  <dt>Giờ làm đêm</dt>
                  <dd>{formatHours(result.nightMinutes)} giờ</dd>
                </div>
              ) : null}
              <div>
                <dt>Số công</dt>
                <dd>{result.workUnits}</dd>
              </div>
              {result.paidLeaveUnits > 0 ? (
                <div>
                  <dt>Công lễ</dt>
                  <dd>{result.paidLeaveUnits}</dd>
                </div>
              ) : null}
            </dl>
            <p className="attendance-detail-meta">
              {result.punchCount} lần chấm · cập nhật {formatTime(result.calculatedAt)} {formatDayMonth(result.calculatedAt)} từ{" "}
              {CHANGE_SOURCE_LABELS[result.lastChangeSource] ?? result.lastChangeSource}
              {result.flags.includes("needs_explanation") ? " · cần giải trình" : ""}
              {result.flags.includes("adjusted") ? " · đã sửa tay" : ""}
            </p>
          </>
        ) : (
          <p className="attendance-detail-empty">{day.isFuture ? "Chưa tới ngày này." : "Ngày này chưa được tính công."}</p>
        )}
      </section>
    </div>
  );
}

// "22/10" in Vietnam time.
function formatDayMonth(value: string) {
  const [, month, day] = vietnamDate(new Date(value)).split("-");
  return `${day}/${month}`;
}

function AttendanceStatsPanel({ days, month, scheduleAvailable, groupStandard }: { days: AttendanceDay[]; month: string; scheduleAvailable: boolean; groupStandard?: MonthStandard | null }) {
  const [activeStatTab, setActiveStatTab] = useState<"active" | "inactive">("active");
  const [year, monthNumber] = month.split("-").map(Number);
  const monthDays = days.filter((day) => !day.isEmpty);
  const results = monthDays.flatMap((day) => (day.result ? [day.result] : []));
  const sum = (pick: (result: AttendanceDayResult) => number) => results.reduce((total, result) => total + pick(result), 0);
  const round = (value: number) => String(Number(value.toFixed(2)));
  const workUnits = sum((result) => result.workUnits);
  const workedHours = sum((result) => result.workedMinutes) / 60;
  // Standard: the shifts scheduled this month, minus days off for a holiday.
  const scheduled = monthDays.filter((day) => day.schedule?.employed && day.schedule.shift && !isDayOffHoliday(day.schedule));
  // AT-25: a group rule set in Cài đặt → Công chuẩn replaces the schedule's figure.
  const standardUnits = groupStandard ? groupStandard.units : scheduled.reduce((total, day) => total + day.schedule!.shift!.workUnits, 0);
  const standardHours = groupStandard ? groupStandard.hours : scheduled.reduce((total, day) => total + day.schedule!.shift!.requiredMinutes / 60, 0);
  const standard = (value: number) => (groupStandard || scheduleAvailable ? round(value) : "--");
  const generatedStats: AttendanceStat[] = [
    { label: "Công làm việc", value: round(workUnits) },
    { label: "Công lễ", value: round(sum((result) => result.paidLeaveUnits)) },
    { label: "Giờ làm việc thực tính", value: workedHours.toFixed(2) },
    { label: groupStandard ? `Số công chuẩn (${groupStandard.rule ?? "theo nhóm"})` : "Số công chuẩn (theo lịch ca)", value: standard(standardUnits) },
    { label: "Số ngày có ca", value: scheduleAvailable ? String(scheduled.length) : "--" },
    { label: "Số lần đi muộn", value: String(results.filter((result) => result.lateMinutes > 0).length) },
    { label: "Số phút đi muộn", value: String(sum((result) => result.lateMinutes)) },
    { label: "Số lần về sớm", value: String(results.filter((result) => result.earlyMinutes > 0).length) },
    { label: "Số phút về sớm", value: String(sum((result) => result.earlyMinutes)) },
    { label: "Số lần quên check in/out", value: String(results.filter((result) => result.status === "missing_checkin" || result.status === "missing_checkout").length) },
    { label: "Số ngày vắng", value: String(results.filter((result) => result.status === "absent").length) },
    { label: "Giờ làm việc thực tính ban đêm", value: (sum((result) => result.nightMinutes) / 60).toFixed(2) },
    { label: "Giờ ngoài ca", value: (sum((result) => result.outsideShiftMinutes) / 60).toFixed(2) }
  ];
  const generatedLabels = new Set(generatedStats.map((item) => item.label));
  const visibleStats = activeStatTab === "active" ? generatedStats : inactiveAttendanceStats.filter((item) => !generatedLabels.has(item.label));

  return (
    <aside className="attendance-stats-panel" aria-labelledby="attendance-stats-title">
      <header className="attendance-stats-header">
        <h2 id="attendance-stats-title">Thống kê T{pad(monthNumber)}, {year}</h2>
      </header>

      <div className="attendance-summary-grid">
        <article className="attendance-summary-card">
          <span>
            <CalendarCheck size={18} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p>Công thực tế</p>
            <strong>
              {round(workUnits)}/{standard(standardUnits)}
            </strong>
          </div>
        </article>
        <article className="attendance-summary-card">
          <span>
            <Clock size={18} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <p>Giờ làm thực tế</p>
            <strong>
              {workedHours.toFixed(1)}/{standard(standardHours)}
            </strong>
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

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

// AT-09: personal monthly attendance calendar with each day's shift from the schedule. Pages key it
// by month, so selection and the picker reset when the month changes.
export function AttendanceBoard({
  banner,
  data,
  moduleTabs,
  schedule,
  standard
}: {
  banner?: ReactNode;
  data: AttendanceData;
  moduleTabs: ReactNode;
  schedule: MyScheduleData;
  standard?: MonthStandard | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const calendarPanelRef = useRef<HTMLDivElement>(null);
  const month = schedule.month;
  const [year, monthNumber] = month.split("-").map(Number);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailPosition, setDetailPosition] = useState<AttendanceDetailPosition>({ top: 0, left: 0 });
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(year);
  const [isNavigating, startNavigation] = useTransition();
  const scheduleDays = schedule.source === "api" ? schedule.days : null;
  const attendanceDays = useMemo(() => buildAttendanceDays(month, data.days, scheduleDays), [data.days, month, scheduleDays]);
  const detailDay = attendanceDays.find((day) => day.date === selectedDate) ?? null;

  function goToMonth(target: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", target);
    setIsMonthPickerOpen(false);
    startNavigation(() => router.push(`${pathname}?${params.toString()}` as Route, { scroll: false }));
  }

  function handleSelectDay(day: AttendanceDay, event: MouseEvent<HTMLButtonElement>) {
    const panel = calendarPanelRef.current;

    if (panel) {
      const panelRect = panel.getBoundingClientRect();
      const cellRect = event.currentTarget.getBoundingClientRect();
      const edge = 16;
      const dialogWidth = 524;
      const dialogHeight = day.result ? 660 : day.schedule?.shift ? 480 : 380;
      const hasRightSpace = cellRect.right + dialogWidth <= window.innerWidth - edge;
      const rawLeft = hasRightSpace ? cellRect.right - panelRect.left : cellRect.left - panelRect.left - dialogWidth;
      const minLeft = edge - panelRect.left;
      const maxLeft = window.innerWidth - edge - dialogWidth - panelRect.left;
      const rawTop = cellRect.top - panelRect.top - 4;
      const maxTop = window.innerHeight - edge - dialogHeight - panelRect.top;

      setDetailPosition({
        left: Math.max(minLeft, Math.min(rawLeft, maxLeft)),
        top: Math.max(edge - panelRect.top, Math.min(rawTop, maxTop))
      });
    }

    setSelectedDate(day.date ?? null);
  }

  return (
    <main className="attendance-board-page" aria-label="Bảng công">
      {data.source === "unavailable" ? (
        <div className="account-api-banner" role="status">
          <strong>Chưa tải được dữ liệu chấm công</strong>
          <span>{data.error}</span>
        </div>
      ) : null}
      {schedule.source === "unavailable" ? (
        <div className="account-api-banner" role="status">
          <strong>Chưa xem được lịch ca</strong>
          <span>{schedule.error}</span>
        </div>
      ) : null}
      <header className="attendance-board-toolbar">
        {moduleTabs}

        <div className="attendance-month-picker">
          <button className="attendance-month-step" type="button" aria-label="Tháng trước" disabled={isNavigating} onClick={() => goToMonth(shiftMonth(month, -1))}>
            <CaretLeft size={16} weight="bold" aria-hidden="true" />
          </button>
          <button
            className="attendance-month-select"
            type="button"
            aria-label="Chọn tháng"
            aria-expanded={isMonthPickerOpen}
            onClick={() => setIsMonthPickerOpen((current) => !current)}
          >
            <CalendarBlank size={16} weight="duotone" aria-hidden="true" />
            {pad(monthNumber)}/{year}
            <CaretDown size={14} weight="duotone" aria-hidden="true" />
          </button>
          <button className="attendance-month-step" type="button" aria-label="Tháng sau" disabled={isNavigating} onClick={() => goToMonth(shiftMonth(month, 1))}>
            <CaretRight size={16} weight="bold" aria-hidden="true" />
          </button>

          {isMonthPickerOpen ? (
            <div className="attendance-month-menu" role="dialog" aria-label="Chọn tháng chấm công">
              <header>
                <button type="button" aria-label="Năm trước" onClick={() => setMonthPickerYear((current) => current - 1)}>
                  <CaretLeft size={18} weight="bold" aria-hidden="true" />
                </button>
                <strong>{monthPickerYear}</strong>
                <button type="button" aria-label="Năm sau" onClick={() => setMonthPickerYear((current) => current + 1)}>
                  <CaretRight size={18} weight="bold" aria-hidden="true" />
                </button>
              </header>

              <div className="attendance-month-grid">
                {months.map((item) => (
                  <button
                    className={item === monthNumber && monthPickerYear === year ? "is-active" : undefined}
                    type="button"
                    key={item}
                    onClick={() => goToMonth(`${monthPickerYear}-${pad(item)}`)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {banner}

      <section className={isNavigating ? "attendance-board-layout is-loading" : "attendance-board-layout"} aria-busy={isNavigating}>
        <div className="attendance-calendar-panel" aria-labelledby="attendance-calendar-title" ref={calendarPanelRef}>
          <h2 className="sr-only" id="attendance-calendar-title">
            Bảng công tháng {pad(monthNumber)}/{year}
          </h2>
          <div className="attendance-calendar-grid">
            {weekdays.map((weekday) => (
              <div className="attendance-weekday" key={weekday}>
                {weekday}
              </div>
            ))}
            {attendanceDays.map((day, index) => (
              <AttendanceDayCell day={day} isSelected={Boolean(day.date) && day.date === selectedDate} key={day.date ?? `empty-${index}`} onSelect={handleSelectDay} />
            ))}
          </div>
          <div className="attendance-calendar-legend" aria-label="Chú thích">
            <span><strong className="attendance-day-score--danger">✕</strong> Vắng: có ca nhưng không có dữ liệu chấm</span>
            <span><strong>N</strong> Không có ca</span>
            <span><strong className="attendance-day-score--info">L</strong> Nghỉ lễ</span>
            <span><strong className="attendance-day-score--info">0</strong> Hôm nay, chưa chấm</span>
            <span><strong>0</strong> Chưa tới ngày</span>
          </div>
          {detailDay ? <AttendanceDetailDialog day={detailDay} onClose={() => setSelectedDate(null)} position={detailPosition} /> : null}
        </div>

        <AttendanceStatsPanel days={attendanceDays} groupStandard={standard} month={month} scheduleAvailable={schedule.source === "api"} />
      </section>
    </main>
  );
}
