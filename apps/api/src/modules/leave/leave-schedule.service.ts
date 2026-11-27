import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { localDate } from "../attendance/engine/zoned-time";
import { resolveDayShift } from "../shifts/shift-resolver";
import { requiredMinutesFor } from "../shifts/shift-rules";
import type { LeaveDayShift } from "./leave-rules";

type Client = Prisma.TransactionClient;

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const asDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

// The shift a person works on each date, as the attendance engine sees it (AT-07): their own
// assignment, else the department / company default on working days. Public holidays and company
// days off are free unless a shift was assigned on purpose.
@Injectable()
export class LeaveScheduleService {
  async load(tx: Client, employeeId: string, from: string, to: string): Promise<(date: string) => LeaveDayShift | null> {
    const [employee, assignments, holidays, policy, shifts] = await Promise.all([
      tx.employee.findUnique({ where: { id: employeeId }, select: { startDate: true, endDate: true, department: { select: { defaultShiftId: true } } } }),
      tx.shiftAssignment.findMany({ where: { employeeId, date: { gte: asDate(from), lte: asDate(to) } }, select: { date: true, shiftId: true } }),
      tx.holiday.findMany({ where: { date: { gte: asDate(from), lte: asDate(to) } } }),
      tx.attendancePolicy.findUnique({ where: { id: "default" } }),
      tx.shift.findMany()
    ]);
    if (!employee) return () => null;

    const timeZone = policy?.timezone ?? "Asia/Ho_Chi_Minh";
    const startDate = localDate(employee.startDate.getTime(), timeZone);
    const endDate = employee.endDate ? localDate(employee.endDate.getTime(), timeZone) : null;
    const assignmentByDate = new Map(assignments.map((item) => [dateKey(item.date), item]));
    const holidayByDate = new Map(holidays.map((item) => [dateKey(item.date), item]));
    const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));

    return (date: string) => {
      if (date < startDate || (endDate && date > endDate)) return null;
      const assignment = assignmentByDate.get(date);
      const holiday = holidayByDate.get(date);
      if (!assignment && holiday && holiday.type !== "compensatory_workday") return null;

      const resolved = resolveDayShift({
        date,
        assignment: assignment ? { shiftId: assignment.shiftId } : undefined,
        departmentDefaultShiftId: employee.department.defaultShiftId,
        companyDefaultShiftId: policy?.defaultShiftId,
        workWeekdays: policy?.workWeekdays ?? [1, 2, 3, 4, 5],
        holiday
      });
      const shift = resolved.shiftId ? shiftsById.get(resolved.shiftId) : undefined;
      if (!shift) return null;
      return {
        startMinute: shift.startMinute,
        endMinute: shift.endMinute,
        breakStartMinute: shift.breakStartMinute,
        breakEndMinute: shift.breakEndMinute,
        requiredMinutes: requiredMinutesFor(shift),
        workUnits: Number(shift.workUnits),
        flexible: shift.type === "flexible"
      };
    };
  }
}
