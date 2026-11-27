import { isoWeekday } from "../attendance/engine/zoned-time";
import { datesBetween } from "./shift-resolver";

// Bulk scheduling (AT-08): which (person, date) cells get which shift, from either one shift on
// chosen weekdays or a repeating pattern. Pure; ShiftAssignmentsService.bulk checks scope and writes.

export type BulkRule =
  // shiftId null = day off. weekdays: ISO 1 = Monday … 7 = Sunday; empty = every day.
  | { kind: "shift"; shiftId: string | null; weekdays: number[] }
  // days[i] is the shift on day i of the cycle (null = day off); the cycle starts on `anchor`.
  | { kind: "pattern"; days: Array<string | null>; anchor: string };

export type BulkEmployee = { id: string; startDate: string; endDate: string | null };

export type BulkCell = { employeeId: string; date: string; shiftId: string | null };

function daysFrom(anchor: string, date: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${anchor}T00:00:00Z`)) / 86_400_000);
}

export function shiftForDate(rule: BulkRule, date: string): { skip: true } | { skip: false; shiftId: string | null } {
  if (rule.kind === "shift") {
    return rule.weekdays.length === 0 || rule.weekdays.includes(isoWeekday(date)) ? { skip: false, shiftId: rule.shiftId } : { skip: true };
  }
  const length = rule.days.length;
  // Positive modulo, so dates before the anchor continue the cycle backwards.
  const index = ((daysFrom(rule.anchor, date) % length) + length) % length;
  return { skip: false, shiftId: rule.days[index] };
}

// Cells for everyone from `from` to `to`, limited to each person's employment period.
export function planBulkCells(employees: BulkEmployee[], from: string, to: string, rule: BulkRule): BulkCell[] {
  const dates = datesBetween(from, to);
  const cells: BulkCell[] = [];
  for (const employee of employees) {
    for (const date of dates) {
      if (date < employee.startDate || (employee.endDate && date > employee.endDate)) continue;
      const planned = shiftForDate(rule, date);
      if (!planned.skip) cells.push({ employeeId: employee.id, date, shiftId: planned.shiftId });
    }
  }
  return cells;
}

export type BulkPreview = { cells: number; create: number; overwrite: number; unchanged: number };

// Compares planned cells with what is assigned now: new cells, cells that change, cells already set.
export function previewBulk(cells: BulkCell[], existing: Map<string, string | null>): BulkPreview {
  const preview: BulkPreview = { cells: cells.length, create: 0, overwrite: 0, unchanged: 0 };
  for (const cell of cells) {
    const key = `${cell.employeeId}:${cell.date}`;
    if (!existing.has(key)) preview.create += 1;
    else if (existing.get(key) === cell.shiftId) preview.unchanged += 1;
    else preview.overwrite += 1;
  }
  return preview;
}
