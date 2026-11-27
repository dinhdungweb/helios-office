"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalDialog } from "@/components/ui/primitives";
import { bulkAssignAction } from "@/lib/shift-actions";
import type { BulkAssignInput, BulkAssignSummary, ScheduleGrid, ShiftPatternRecord } from "@/lib/shift-format";

const WEEKDAYS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 7, label: "CN" }
];

type Props = {
  grid: ScheduleGrid;
  patterns: ShiftPatternRecord[];
  // People picked on the grid, preselected as targets.
  preselectedEmployeeIds: string[];
  onClose: () => void;
  onDone: (message: string) => void;
};

// AT-08: one shift on chosen weekdays, or a repeating pattern, for people and whole departments over
// a date range. Saving needs a fresh preview of what will change.
export function ShiftBulkDialog({ grid, patterns, preselectedEmployeeIds, onClose, onDone }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const activeShifts = grid.shifts.filter((shift) => shift.status === "active");
  const activePatterns = patterns.filter((pattern) => pattern.status === "active");
  const departments = useMemo(() => {
    const map = new Map<string, { id: string; name: string; people: number }>();
    grid.employees.forEach((employee) => {
      const current = map.get(employee.department.id);
      map.set(employee.department.id, { ...employee.department, people: (current?.people ?? 0) + 1 });
    });
    return [...map.values()];
  }, [grid]);

  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [employeeIds, setEmployeeIds] = useState<string[]>(preselectedEmployeeIds);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(grid.from);
  const [to, setTo] = useState(grid.to);
  const [mode, setMode] = useState<"shift" | "pattern">("shift");
  const [shiftId, setShiftId] = useState(activeShifts[0]?.id ?? "off");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [patternId, setPatternId] = useState(activePatterns[0]?.id ?? "");
  const [overwrite, setOverwrite] = useState(true);
  const [preview, setPreview] = useState<{ key: string; summary: BulkAssignSummary } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const input: BulkAssignInput = {
    employeeIds,
    departmentIds,
    from,
    to,
    mode,
    overwrite,
    ...(mode === "shift" ? { shiftId: shiftId === "off" ? null : shiftId, weekdays } : { patternId })
  };
  const inputKey = JSON.stringify(input);
  const currentPreview = preview?.key === inputKey ? preview.summary : null;
  const toggle = (list: number[] | string[], value: number | string) =>
    (list as Array<number | string>).includes(value) ? (list as Array<number | string>).filter((item) => item !== value) : [...list, value];
  const visibleEmployees = grid.employees.filter((employee) =>
    `${employee.fullName} ${employee.code}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  const ready = (employeeIds.length > 0 || departmentIds.length > 0) && from && to && (mode === "shift" || patternId);

  const submit = (save: boolean) =>
    startTransition(async () => {
      setError(null);
      const result = await bulkAssignAction(input, !save);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!save) {
        setPreview({ key: inputKey, summary: result.data });
        return;
      }
      router.refresh();
      onDone(`Đã xếp ${result.data.written} ô cho ${result.data.employees} người.`);
      onClose();
    });

  return (
    <ModalDialog className="shift-dialog shift-bulk-dialog" ref={dialogRef} title="Xếp ca hàng loạt" onCloseRequest={onClose} onCancel={onClose}>
      <div className="account-dialog-form">
        <fieldset className="shift-bulk-group">
          <legend>Áp dụng cho</legend>
          <div className="shift-bulk-options">
            {departments.map((department) => (
              <label key={department.id}>
                <input
                  checked={departmentIds.includes(department.id)}
                  type="checkbox"
                  onChange={() => setDepartmentIds((current) => toggle(current, department.id) as string[])}
                />
                {department.name} <small>({department.people})</small>
              </label>
            ))}
          </div>
          <details open={employeeIds.length > 0}>
            <summary>Thêm từng người ({employeeIds.length} đã chọn)</summary>
            <input aria-label="Tìm nhân sự" placeholder="Tìm theo tên hoặc mã" value={search} onChange={(event) => setSearch(event.target.value)} />
            <div className="shift-bulk-people">
              {visibleEmployees.map((employee) => (
                <label key={employee.id}>
                  <input
                    checked={employeeIds.includes(employee.id)}
                    type="checkbox"
                    onChange={() => setEmployeeIds((current) => toggle(current, employee.id) as string[])}
                  />
                  {employee.fullName} <small>{employee.code} · {employee.department.name}</small>
                </label>
              ))}
            </div>
          </details>
        </fieldset>

        <div className="shift-dialog-grid">
          <label className="account-dialog-field">
            <span>Từ ngày</span>
            <input required type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="account-dialog-field">
            <span>Đến ngày</span>
            <input min={from} required type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>

        <fieldset className="shift-bulk-group">
          <legend>Cách xếp</legend>
          <div className="shift-bulk-options">
            <label>
              <input checked={mode === "shift"} name="bulk-mode" type="radio" onChange={() => setMode("shift")} />
              Một ca vào các thứ đã chọn
            </label>
            <label>
              <input checked={mode === "pattern"} disabled={activePatterns.length === 0} name="bulk-mode" type="radio" onChange={() => setMode("pattern")} />
              Theo mẫu lặp {activePatterns.length === 0 ? <small>(chưa có mẫu, tạo ở Cài đặt ca)</small> : null}
            </label>
          </div>
          {mode === "shift" ? (
            <>
              <label className="account-dialog-field">
                <span>Ca</span>
                <select value={shiftId} onChange={(event) => setShiftId(event.target.value)}>
                  {activeShifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>{shift.code} — {shift.name}</option>
                  ))}
                  <option value="off">Nghỉ</option>
                </select>
              </label>
              <div className="shift-bulk-options" role="group" aria-label="Các thứ trong tuần">
                {WEEKDAYS.map((weekday) => (
                  <label key={weekday.value}>
                    <input checked={weekdays.includes(weekday.value)} type="checkbox" onChange={() => setWeekdays((current) => toggle(current, weekday.value) as number[])} />
                    {weekday.label}
                  </label>
                ))}
              </div>
            </>
          ) : (
            <label className="account-dialog-field">
              <span>Mẫu (ngày 1 của mẫu = ngày bắt đầu)</span>
              <select value={patternId} onChange={(event) => setPatternId(event.target.value)}>
                {activePatterns.map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>{pattern.name} — chu kỳ {pattern.days.length} ngày</option>
                ))}
              </select>
            </label>
          )}
        </fieldset>

        <label className="shift-bulk-overwrite">
          <input checked={overwrite} type="checkbox" onChange={(event) => setOverwrite(event.target.checked)} />
          Ghi đè những ngày đã xếp ca riêng
        </label>

        {currentPreview ? (
          <p className="shift-bulk-preview" role="status">
            {currentPreview.employees} người, {currentPreview.cells} ô: <strong>{currentPreview.create}</strong> ô mới,{" "}
            <strong>{currentPreview.overwrite}</strong> ô đã xếp khác{overwrite ? " (sẽ ghi đè)" : " (giữ nguyên)"}, {currentPreview.unchanged} ô không đổi. Sẽ lưu{" "}
            <strong>{currentPreview.written}</strong> ô.
          </p>
        ) : null}
        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}

        <div className="account-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>HỦY BỎ</button>
          <button className="secondary-button" disabled={!ready || isPending} type="button" onClick={() => submit(false)}>XEM TRƯỚC</button>
          <button
            className="primary-button"
            disabled={!currentPreview || currentPreview.written === 0 || isPending}
            title={currentPreview ? undefined : "Bấm Xem trước để kiểm tra trước khi lưu"}
            type="button"
            onClick={() => submit(true)}
          >
            {isPending ? "ĐANG XỬ LÝ..." : "XẾP CA"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
