"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StateBlock } from "@/components/ui/primitives";
import { assignShiftsAction, clearAssignmentsAction, setDepartmentDefaultShiftAction, type ShiftActionResult } from "@/lib/shift-actions";
import { addCalendarDays, minuteToTime, type ScheduleCell, type ScheduleData, type ScheduleShift } from "@/lib/shift-format";

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

function ShiftBadge({ cell, shift }: { cell: ScheduleCell; shift: ScheduleShift | undefined }) {
  if (!cell.shiftId || !shift) {
    return <span className={cell.source === "assignment" ? "schedule-off is-assigned" : "schedule-off"}>Nghỉ</span>;
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

// AT-07: weekly shift schedule for the people in the viewer's scope. Assigned cells are solid;
// cells that come from a department or company default are faded.
export function ShiftScheduleBoard({ data, departmentId }: { data: ScheduleData; departmentId: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [targetShift, setTargetShift] = useState("");
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
  const weekHref = (from: string) => `?from=${from}${departmentId ? `&department=${departmentId}` : ""}`;

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
        <nav className="shift-schedule-week" aria-label="Chọn tuần">
          <a href={weekHref(addCalendarDays(grid.from, -7))}>‹ Tuần trước</a>
          <strong>{dayLabel(grid.from).short} – {dayLabel(grid.to).short}/{grid.to.slice(0, 4)}</strong>
          <a href={weekHref(addCalendarDays(grid.from, 7))}>Tuần sau ›</a>
        </nav>
        <label className="shift-schedule-filter">
          <span>Phòng ban</span>
          <select value={departmentId} onChange={(event) => router.push(`?from=${grid.from}${event.target.value ? `&department=${event.target.value}` : ""}`)}>
            <option value="">Tất cả ({grid.employees.length} người)</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
        </label>
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
        <table className="shift-schedule-table">
          <thead>
            <tr>
              <th scope="col">Nhân sự</th>
              {dates.map((date) => {
                const label = dayLabel(date);
                const holiday = holidays.get(date);
                return (
                  <th key={date} scope="col" className={holiday && holiday.type !== "compensatory_workday" ? "is-holiday" : undefined}>
                    <button type="button" onClick={() => toggle(employees.map((employee) => cellKey(employee.id, date)))} title="Chọn cả cột">
                      <strong>{label.weekday}</strong> {label.short}
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
                        <ShiftBadge cell={cell} shift={cell.shiftId ? shiftsById.get(cell.shiftId) : undefined} />
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
    </section>
  );
}
