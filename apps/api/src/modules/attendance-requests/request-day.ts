import { BadRequestException } from "@nestjs/common";
import type { Prisma, Request, Shift } from "@prisma/client";
import { plainToInstance, type ClassConstructor } from "class-transformer";
import { validate } from "class-validator";
import type { HandlerContext } from "../approvals/engine/request-types";
import type { AttendanceRecalcService } from "../attendance/attendance-recalc.service";
import { localDate, zonedInstant } from "../attendance/engine/zoned-time";
import { resolveDayShift } from "../shifts/shift-resolver";

// Shared by the attendance request types (absence, overtime, check-in/out, shift change,
// resignation): payload validation, the shift of a date, locked periods, and the adjustments an
// approved request writes (AT-22, docs/design/approval-engine.md §8).

export type Tx = Prisma.TransactionClient;

export const dbDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
export const isoDate = (value: Date) => value.toISOString().slice(0, 10);

export function parseMinute(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) throw new BadRequestException(`Giờ ${time} không hợp lệ.`);
  return hours * 60 + minutes;
}

export const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
};

export async function parsePayload<T extends object>(dto: ClassConstructor<T>, raw: unknown, message: string): Promise<T> {
  const value = plainToInstance(dto, raw ?? {});
  const problems = await validate(value, { whitelist: true });
  if (problems.length > 0) throw new BadRequestException(message);
  return value;
}

export async function timeZoneOf(tx: Tx) {
  const policy = await tx.attendancePolicy.findUnique({ where: { id: "default" }, select: { timezone: true } });
  return policy?.timezone ?? "Asia/Ho_Chi_Minh";
}

export function todayIn(timeZone: string) {
  return localDate(Date.now(), timeZone);
}

export type DayShift = Pick<Shift, "id" | "code" | "name" | "type" | "startMinute" | "endMinute" | "breakStartMinute" | "breakEndMinute">;

export type ResolvedDay = {
  date: string;
  employed: boolean;
  shift: DayShift | null;
  holiday: { name: string; type: string } | null;
  assignment: { shiftId: string | null; note: string | null } | null;
};

const SHIFT_FIELDS = { id: true, code: true, name: true, type: true, startMinute: true, endMinute: true, breakStartMinute: true, breakEndMinute: true } as const;

// The shift a person works on a date, as the attendance engine sees it: their own assignment, else
// the department / company default on working days. Holidays are free unless a shift was assigned.
export async function resolveDay(tx: Tx, employeeId: string, date: string): Promise<ResolvedDay> {
  const [employee, assignment, holiday, policy] = await Promise.all([
    tx.employee.findUnique({ where: { id: employeeId }, select: { startDate: true, endDate: true, department: { select: { defaultShiftId: true } } } }),
    tx.shiftAssignment.findUnique({ where: { employeeId_date: { employeeId, date: dbDate(date) } }, select: { shiftId: true, note: true } }),
    tx.holiday.findFirst({ where: { date: dbDate(date) }, select: { name: true, type: true } }),
    tx.attendancePolicy.findUnique({ where: { id: "default" } })
  ]);
  const timeZone = policy?.timezone ?? "Asia/Ho_Chi_Minh";
  if (!employee) return { date, employed: false, shift: null, holiday: null, assignment: null };
  const startDate = localDate(employee.startDate.getTime(), timeZone);
  const endDate = employee.endDate ? localDate(employee.endDate.getTime(), timeZone) : null;
  const employed = date >= startDate && (!endDate || date <= endDate);

  const offForHoliday = !assignment && holiday !== null && holiday.type !== "compensatory_workday";
  const resolved = resolveDayShift({
    date,
    assignment: assignment ? { shiftId: assignment.shiftId } : undefined,
    departmentDefaultShiftId: employee.department.defaultShiftId,
    companyDefaultShiftId: policy?.defaultShiftId,
    workWeekdays: policy?.workWeekdays ?? [1, 2, 3, 4, 5],
    holiday: holiday ? { type: holiday.type as never } : null
  });
  // An archived shift still on the schedule counts as no shift, as in the engine.
  const shift =
    !employed || offForHoliday || !resolved.shiftId ? null : await tx.shift.findFirst({ where: { id: resolved.shiftId, status: "active" }, select: SHIFT_FIELDS });
  return { date, employed, shift, holiday, assignment };
}

// The shift's time on its date, in instants (an end not after the start ends the next day).
export function shiftWindow(date: string, shift: Pick<DayShift, "startMinute" | "endMinute">, timeZone: string) {
  const end = shift.endMinute <= shift.startMinute ? shift.endMinute + 1440 : shift.endMinute;
  return { start: zonedInstant(date, shift.startMinute, timeZone), end: zonedInstant(date, end, timeZone) };
}

export async function assertPeriodsOpen(tx: Tx, dates: string[], what: string) {
  const months = [...new Set(dates.map((date) => date.slice(0, 7)))];
  if (months.length === 0) return;
  const locked = await tx.attendancePeriod.findMany({ where: { month: { in: months }, status: "locked" }, select: { month: true } });
  if (locked.length > 0) throw new BadRequestException(`Kỳ công ${locked.map((item) => item.month).join(", ")} đã chốt, không tạo ${what} cho những ngày này được.`);
}

// Other pending / approved requests of the same type and person touching the dates.
export async function sameTypeRequests(tx: Tx, type: string, requesterId: string, from: string, to: string, requestId?: string) {
  return tx.request.findMany({
    where: {
      type,
      requesterId,
      status: { in: ["pending", "approved"] },
      fromDate: { lte: dbDate(to) },
      toDate: { gte: dbDate(from) },
      ...(requestId ? { id: { not: requestId } } : {})
    },
    select: { id: true, code: true, payload: true }
  });
}

export const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

// HR cancelled an approved request: what it wrote on the timesheet stops counting.
export async function revokeAdjustments(request: Request, context: HandlerContext) {
  await context.tx.attendanceAdjustment.updateMany({
    where: { sourceRequestId: request.id, revokedAt: null },
    data: { revokedAt: new Date(), revokedById: context.actorId ?? null }
  });
}

// Recalculates the dates after the transaction commits (the recalculation reads through its own connection).
export function recalculateLater(recalc: Pick<AttendanceRecalcService, "request">, request: Request, context: HandlerContext, dates: string[]) {
  const sorted = [...dates].sort();
  if (sorted.length === 0) return;
  context.defer?.("Tính lại công", () =>
    recalc.request({ from: sorted[0], to: sorted.at(-1)!, employeeIds: [request.requesterId], reason: "request", requestedById: context.actorId })
  );
}
