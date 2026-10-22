"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StateBlock } from "@/components/ui/primitives";
import { ShiftBulkDialog } from "@/components/hcns/shift-bulk-dialog";
import { assignShiftsAction, clearAssignmentsAction, setDepartmentDefaultShiftAction, type ShiftActionResult } from "@/lib/shift-actions";
import { addCalendarDays, minuteToTime, type ScheduleCell, type ScheduleData, type ScheduleShift, type ShiftPatternData } from "@/lib/shift-format";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const SOURCE_LABELS: Record<ScheduleCell["source"], string> = {
  assignment: "Xếp riêng",
  department: "Mặc định phòng ban",
  company: "Mặc định công ty",
  none: "Ngày nghỉ"
};

const cellKey = (employeeId: string, date: string) => `${employeeId}|${date}`;

function dayLabel(date: string) {
  const [, month, day] = date.split("-");
  return { weekday: WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()], short: `${day}/${month}` };
}

function ShiftBadge({ cell, shift, compact }: { cell: ScheduleCell; shift: ScheduleShift | undefined; compact: boolean }) {
  if (!cell.shiftId || !shift) {
    // The month view writes a day without a shift as "N", like 1Office.
    return <span className={cell.source === "assignment" ? "schedule-off is-assigned" : "schedule-off"} title={SOURCE_LABELS[cell.source]}>{compact ? "N" : "Nghỉ"}</span>;
  }
  return (
    <span
      className={cell.source === "assignment" ? "schedule-shift is-assigned" : "schedule-shift"}
      style={{ "--shift-color": shift.color ?? "#64748b" } as React.CSSProperties}
      title={`${shift.name} ${minuteToTime(shift.startMinute)}–${minuteToTime(shift.endMinute)} · ${SOURCE_LABELS[cell.source]}${cell.note ? ` · ${cell.note}` : ""}`}
    >
      {shift.code}
    </span>
  );
}

type BoardProps = { data: ScheduleData; departmentId: string; patterns: ShiftPatternData; view: "week" | "month" };

// AT-07: shift schedule by week or month for the people in the viewer's scope. Assigned cells are
// solid; cells that come from a department or company default are faded. AT-08: bulk scheduling.
export function ShiftScheduleBoard({ data, departmentId, patterns, view }: BoardProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [targetShift, setTargetShift] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const grid = data.source === "api" ? data.grid : null;
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    grid?.employees.forEach((employee) => map.set(employee.department.id, employee.department.name));
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [grid]);

  if (data.source === "unavailable" || !grid) {
    return (
      <StateBlock tone="error" title="Chưa tải được lịch ca">
        {data.source === "unavailable" ? data.error : ""}
      </StateBlock>
    );
  }

  const shiftsById = new Map(grid.shifts.map((shift) => [shift.id, shift]));
  const activeShifts = grid.shifts.filter((shift) => shift.status === "active");
  const holidays = new Map(grid.holidays.map((holiday) => [holiday.date, holiday]));
  const employees = departmentId ? grid.employees.filter((employee) => employee.department.id === departmentId) : grid.employees;
  const dates = employees[0]?.days.map((cell) => cell.date) ?? [];
  const href = (from: string, target: "week" | "month" = view) =>
    `?from=${from}${target === "month" ? "&view=month" : ""}${departmentId ? `&department=${departmentId}` : ""}`;
  const previous = view === "month" ? `${addCalendarDays(grid.from, -1).slice(0, 7)}-01` : addCalendarDays(grid.from, -7);
  const next = view === "month" ? addCalendarDays(grid.to, 1) : addCalendarDays(grid.from, 7);
  const compact = view === "month";

  const toggle = (keys: string[]) =>
    setSelected((current) => {
      const next = new Set(current);
      const allSelected = keys.every((key) => next.has(key));
      keys.forEach((key) => (allSelected ? next.delete(key) : next.add(key)));
      return next;
    });

  const run = (action: () => Promise<ShiftActionResult>, success: string) =>
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (result.ok) {
        setSelected(new Set());
        setMessage({ text: success, error: false });
        router.refresh();
      } else {
        setMessage({ text: result.error, error: true });
      }
    });

  // Selected cells grouped by date, so one request per date set covers everyone picked on it.
  const applySelection = (clear: boolean) => {
    const byEmployee = new Map<string, string[]>();
    selected.forEach((key) => {
      const [employeeId, date] = key.split("|");
      byEmployee.set(employeeId, [...(byEmployee.get(employeeId) ?? []), date]);
    });
    const groups = new Map<string, string[]>();
    byEmployee.forEach((employeeDates, employeeId) => {
      const signature = employeeDates.sort().join(",");
      groups.set(signature, [...(groups.get(signature) ?? []), employeeId]);
    });

    const shiftId = targetShift === "off" ? null : targetShift;
    run(async () => {
      for (const [signature, employeeIds] of groups) {
        const result = clear ? await clearAssignmentsAction(employeeIds, signature.split(",")) : await assignShiftsAction(employeeIds, signature.split(","), shiftId);
        if (!result.ok) return result;
      }
      return { ok: true };
    }, clear ? `Đã trả ${selected.size} ô về ca mặc định.` : `Đã xếp ca cho ${selected.size} ô.`);
  };

  const currentDepartment = departments.find((department) => department.id === departmentId);

  return (
    <section className="shift-schedule" aria-labelledby="shift-schedule-title">
      <header className="shift-schedule-header">
        <h1 id="shift-schedule-title">Lịch ca</h1>
        <nav className="shift-schedule-view" aria-label="Kiểu xem">
          <a aria-current={view === "week" ? "page" : undefined} href={href(grid.from, "week")}>Tuần</a>
          <a aria-current={view === "month" ? "page" : undefined} href={href(grid.from, "month")}>Tháng</a>
        </nav>
        <nav className="shift-schedule-week" aria-label={view === "month" ? "Chọn tháng" : "Chọn tuần"}>
          <a href={href(previous)}>‹ {view === "month" ? "Tháng trước" : "Tuần trước"}</a>
          <strong>
            {view === "month" ? `Tháng ${Number(grid.from.slice(5, 7))}/${grid.from.slice(0, 4)}` : `${dayLabel(grid.from).short} – ${dayLabel(grid.to).short}/${grid.to.slice(0, 4)}`}
          </strong>
          <a href={href(next)}>{view === "month" ? "Tháng sau" : "Tuần sau"} ›</a>
        </nav>
        <label className="shift-schedule-filter">
          <span>Phòng ban</span>
          <select
            value={departmentId}
            onChange={(event) => router.push(`?from=${grid.from}${view === "month" ? "&view=month" : ""}${event.target.value ? `&department=${event.target.value}` : ""}`)}
          >
            <option value="">Tất cả ({grid.employees.length} người)</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
        </label>
        <button className="primary-button" type="button" onClick={() => setBulkOpen(true)}>Xếp ca hàng loạt</button>
      </header>

      {currentDepartment ? (
        <div className="shift-schedule-default">
          <span>Ca mặc định của {currentDepartment.name}:</span>
          <select
            aria-label="Ca mặc định phòng ban"
            defaultValue=""
            disabled={isPending}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) return;
              run(() => setDepartmentDefaultShiftAction(currentDepartment.id, value === "company" ? null : value), "Đã đổi ca mặc định của phòng ban.");
              event.target.value = "";
            }}
          >
            <option value="">Đổi…</option>
            <option value="company">Theo ca mặc định công ty</option>
            {activeShifts.map((shift) => (
              <option key={shift.id} value={shift.id}>{shift.code} — {shift.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      {message ? <p className={message.error ? "personnel-catalog-message is-error" : "personnel-catalog-message"} role="status">{message.text}</p> : null}

      <div className="shift-schedule-legend" aria-label="Chú thích">
        {activeShifts.map((shift) => (
          <span key={shift.id}>
            <span className="schedule-shift is-assigned" style={{ "--shift-color": shift.color ?? "#64748b" } as React.CSSProperties}>{shift.code}</span>
            {shift.name} {minuteToTime(shift.startMinute)}–{minuteToTime(shift.endMinute)}
          </span>
        ))}
        <span><span className="schedule-shift">HC</span> nhạt = theo ca mặc định</span>
      </div>

      <div className="shift-schedule-table-shell" tabIndex={0} aria-label="Lịch ca có thể cuộn ngang">
        <table className={compact ? "shift-schedule-table is-month" : "shift-schedule-table"}>
          <thead>
            <tr>
              <th scope="col">Nhân sự</th>
              {dates.map((date) => {
                const label = dayLabel(date);
                const holiday = holidays.get(date);
                return (
                  <th
                    key={date}
                    scope="col"
                    className={
                      [holiday && holiday.type !== "compensatory_workday" ? "is-holiday" : "", label.weekday === "T7" || label.weekday === "CN" ? "is-weekend" : ""]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                  >
                    <button type="button" onClick={() => toggle(employees.map((employee) => cellKey(employee.id, date)))} title="Chọn cả cột">
                      <strong>{label.weekday}</strong> {compact ? label.short.slice(0, 2) : label.short}
                    </button>
                    {holiday ? <small>{holiday.name}</small> : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <th scope="row">
                  <button type="button" onClick={() => toggle(employee.days.map((cell) => cellKey(employee.id, cell.date)))} title="Chọn cả hàng">
                    <strong>{employee.fullName}</strong>
                    <small>{employee.code} · {employee.department.name}</small>
                  </button>
                </th>
                {employee.days.map((cell) => {
                  const key = cellKey(employee.id, cell.date);
                  return (
                    <td key={cell.date} className={selected.has(key) ? "is-selected" : undefined}>
                      <button aria-pressed={selected.has(key)} type="button" onClick={() => toggle([key])} aria-label={`${employee.fullName} ${cell.date}`}>
                        <ShiftBadge cell={cell} compact={compact} shift={cell.shiftId ? shiftsById.get(cell.shiftId) : undefined} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {employees.length === 0 ? (
              <tr>
                <td colSpan={dates.length + 1}>Không có nhân sự nào trong phạm vi của bạn.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected.size > 0 ? (
        <div className="shift-schedule-actions" role="region" aria-label="Xếp ca cho ô đã chọn">
          <span>Đã chọn {selected.size} ô</span>
          <select aria-label="Ca để xếp" value={targetShift} onChange={(event) => setTargetShift(event.target.value)}>
            <option value="">Chọn ca…</option>
            {activeShifts.map((shift) => (
              <option key={shift.id} value={shift.id}>{shift.code} — {shift.name}</option>
            ))}
            <option value="off">Nghỉ</option>
          </select>
          <button className="primary-button" disabled={!targetShift || isPending} type="button" onClick={() => applySelection(false)}>Xếp ca</button>
          <button className="secondary-button" disabled={isPending} type="button" onClick={() => applySelection(true)}>Về mặc định</button>
          <button className="secondary-button" disabled={isPending} type="button" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
        </div>
      ) : null}

      {bulkOpen ? (
        <ShiftBulkDialog
          grid={grid}
          patterns={patterns.source === "api" ? patterns.patterns : []}
          preselectedEmployeeIds={[...new Set([...selected].map((key) => key.split("|")[0]))]}
          onClose={() => setBulkOpen(false)}
          onDone={(text) => {
            setSelected(new Set());
            setMessage({ text, error: false });
          }}
        />
      ) : null}
    </section>
  );
}
