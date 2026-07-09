import {
  CalendarBlank,
  CalendarCheck,
  CaretDown,
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

const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

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

function AttendanceDayCell({ day }: { day: AttendanceDay }) {
  if (day.isEmpty) {
    return <div className="attendance-month-cell attendance-month-cell--empty" aria-hidden="true" />;
  }

  return (
    <button
      className={day.isSelected ? "attendance-month-cell is-selected" : "attendance-month-cell"}
      type="button"
      aria-label={`Ngày ${day.day}, công ${day.score}`}
    >
      <span className="attendance-day-number">{day.day}</span>
      <strong className={`attendance-day-score attendance-day-score--${day.scoreTone ?? "muted"}`}>
        {day.score === "x" ? <X size={18} weight="bold" aria-label="Nghỉ không lý do" /> : day.score}
      </strong>
      {day.time ? <span className={day.scoreTone === "danger" ? "attendance-day-time is-danger" : "attendance-day-time"}>{day.time}</span> : null}
      {day.shift ? <span className="attendance-day-shift">{day.shift}</span> : null}
    </button>
  );
}

function AttendanceStatsPanel() {
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
        <button className="is-active" type="button" role="tab" aria-selected="true">
          Dữ liệu phát sinh
        </button>
        <button type="button" role="tab" aria-selected="false">
          Dữ liệu không phát sinh
        </button>
      </div>

      <dl className="attendance-stat-list">
        {attendanceStats.map((item) => (
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

        <button className="attendance-month-select" type="button" aria-label="Chọn tháng">
          <CalendarBlank size={16} weight="duotone" aria-hidden="true" />
          07/2026
          <CaretDown size={14} weight="duotone" aria-hidden="true" />
        </button>
      </header>

      <section className="attendance-board-layout">
        <div className="attendance-calendar-panel" aria-labelledby="attendance-calendar-title">
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
              <AttendanceDayCell day={day} key={`${day.day ?? "empty"}-${index}`} />
            ))}
          </div>
        </div>

        <AttendanceStatsPanel />
      </section>
    </main>
  );
}
