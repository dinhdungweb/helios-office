import { BadRequestException, Injectable } from "@nestjs/common";
import type { AttendanceDayStatus, Prisma } from "@prisma/client";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { pageArgs, paginated } from "../../common/pagination/list-query";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { ResolvedScope } from "../../common/data-scope/data-scope.types";
import type { AuthenticatedUser } from "../auth/auth.types";
import { datesBetween, resolveDayShift } from "../shifts/shift-resolver";
import { requiredMinutesFor } from "../shifts/shift-rules";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import { AttendanceConfirmationService } from "./attendance-confirmation.service";
import { AttendancePeriodService } from "./attendance-period.service";
import { StandardWorkdayService } from "./standard-workdays.service";
import type { TimesheetQueryDto } from "./attendance-query.dto";
import { addDays, isoWeekday, localDate, zonedInstant } from "./engine/zoned-time";

// Monthly timesheet (AT-16), like 1Office's Bảng chấm công: one row per person in scope, one cell
// per day from the engine's results (future days show the scheduled shift), and month totals.

export const TIMESHEET_PERMISSIONS = [
  "permission.attendance-timesheets.view",
  "permission.attendance-timesheets.manage",
  "permission.attendance.view",
  "permission.attendance.manage"
];

const WORK_STATUSES = new Set<AttendanceDayStatus>(["on_time", "late", "early_leave", "late_and_early", "missing_checkin", "missing_checkout", "absent"]);

const dbDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const round2 = (value: number) => Math.round(value * 100) / 100;

export type TimesheetCell = {
  date: string;
  // null when the day has no result yet (future, or not calculated).
  id: string | null;
  status: AttendanceDayStatus | null;
  shiftCode: string | null;
  shiftColor: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  workedMinutes: number;
  workUnits: number;
  paidLeaveUnits: number;
  lateMinutes: number;
  earlyMinutes: number;
  outsideShiftMinutes: number;
  adjusted: boolean;
  needsExplanation: boolean;
};

@Injectable()
export class AttendanceTimesheetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScope: DataScopeService,
    private readonly calculation: AttendanceCalculationService,
    private readonly periods: AttendancePeriodService,
    private readonly confirmations: AttendanceConfirmationService,
    private readonly standards: StandardWorkdayService
  ) {}

  async monthly(user: AuthenticatedUser, query: TimesheetQueryDto) {
    const scope = await this.dataScope.resolve(user, TIMESHEET_PERMISSIONS);
    return this.build(scope, query, true);
  }

  // The whole month for an export (AT-18): every person in the scope, no paging.
  async fullMonth(scope: ResolvedScope, query: Pick<TimesheetQueryDto, "month" | "departmentId">) {
    return this.build(scope, query, false);
  }

  private async build(scope: ResolvedScope, query: TimesheetQueryDto, paged: boolean) {
    const policy = await this.calculation.getPolicy();
    const timeZone = policy.timezone;
    const today = localDate(Date.now(), timeZone);
    const month = query.month ?? today.slice(0, 7);
    const [year, monthNumber] = month.split("-").map(Number);
    if (!year || monthNumber < 1 || monthNumber > 12) throw new BadRequestException("Tháng phải có dạng YYYY-MM.");
    const from = `${month}-01`;
    const to = addDays(`${addDays(from, 31).slice(0, 7)}-01`, -1);
    const dates = datesBetween(from, to);

    const where: Prisma.EmployeeWhereInput = {
      AND: [
        this.dataScope.employeeWhere(scope),
        query.departmentId ? { departmentId: query.departmentId } : {},
        query.q ? { OR: [{ fullName: { contains: query.q, mode: "insensitive" } }, { code: { contains: query.q, mode: "insensitive" } }] } : {},
        // Everyone employed at some point in the month, people who left during it included.
        { startDate: { lt: new Date(zonedInstant(addDays(to, 1), 0, timeZone)) } },
        { OR: [{ endDate: null }, { endDate: { gte: new Date(zonedInstant(from, 0, timeZone)) } }] }
      ]
    };
    const { skip, take } = paged ? pageArgs(query) : { skip: undefined, take: undefined };
    const [total, employees] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        select: { id: true, code: true, fullName: true, positionId: true, startDate: true, endDate: true, department: { select: { id: true, name: true, defaultShiftId: true } } },
        orderBy: [{ department: { name: "asc" } }, { code: "asc" }],
        skip,
        take
      })
    ]);
    const ids = employees.map((employee) => employee.id);

    const [results, assignments, holidays, shifts, period, answers, confirmationCounts, standardOf] = await Promise.all([
      this.prisma.attendanceDay.findMany({
        where: { employeeId: { in: ids }, workDate: { gte: dbDate(from), lte: dbDate(to) } },
        include: { shift: { select: { code: true, color: true } } }
      }),
      this.prisma.shiftAssignment.findMany({ where: { employeeId: { in: ids }, date: { gte: dbDate(from), lte: dbDate(to) } }, select: { employeeId: true, date: true, shiftId: true } }),
      this.prisma.holiday.findMany({ where: { date: { gte: dbDate(from), lte: dbDate(to) } } }),
      this.prisma.shift.findMany(),
      this.periods.view(month),
      this.confirmations.byEmployee(month, ids),
      this.confirmations.counts(month, this.dataScope.employeeWhere(scope)),
      this.standards.resolverFor(month)
    ]);
    const resultByCell = new Map(results.map((result) => [`${result.employeeId}:${isoDate(result.workDate)}`, result]));
    const assignmentByCell = new Map(assignments.map((assignment) => [`${assignment.employeeId}:${isoDate(assignment.date)}`, assignment.shiftId]));
    const holidayByDate = new Map(holidays.map((holiday) => [isoDate(holiday.date), holiday]));
    const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));

    const rows = employees.map((employee) => {
      const startDate = localDate(employee.startDate.getTime(), timeZone);
      const endDate = employee.endDate ? localDate(employee.endDate.getTime(), timeZone) : null;
      let standardUnits = 0;
      let standardMinutes = 0;

      const cells: TimesheetCell[] = dates.map((date) => {
        const key = `${employee.id}:${date}`;
        const holiday = holidayByDate.get(date);
        const employed = date >= startDate && (!endDate || date <= endDate);
        const resolved = employed
          ? resolveDayShift({
              date,
              assignment: assignmentByCell.has(key) ? { shiftId: assignmentByCell.get(key)! } : undefined,
              departmentDefaultShiftId: employee.department.defaultShiftId,
              companyDefaultShiftId: policy.defaultShiftId,
              workWeekdays: policy.workWeekdays,
              holiday
            })
          : { shiftId: null, source: "none" as const };
        const shift = resolved.shiftId ? shiftsById.get(resolved.shiftId) : undefined;
        if (shift && !(holiday && holiday.type !== "compensatory_workday")) {
          standardUnits += Number(shift.workUnits);
          standardMinutes += requiredMinutesFor(shift);
        }

        const result = resultByCell.get(key);
        return {
          date,
          id: result?.id ?? null,
          status: result?.status ?? null,
          shiftCode: result?.shift?.code ?? shift?.code ?? null,
          shiftColor: result?.shift?.color ?? shift?.color ?? null,
          checkIn: result?.checkIn ?? null,
          checkOut: result?.checkOut ?? null,
          workedMinutes: result?.workedMinutes ?? 0,
          workUnits: result ? Number(result.workUnits) : 0,
          paidLeaveUnits: result ? Number(result.paidLeaveUnits) : 0,
          lateMinutes: result?.lateMinutes ?? 0,
          earlyMinutes: result?.earlyMinutes ?? 0,
          outsideShiftMinutes: result?.outsideShiftMinutes ?? 0,
          adjusted: result?.flags.includes("adjusted") ?? false,
          needsExplanation: result?.flags.includes("needs_explanation") ?? false
        };
      });

      const worked = cells.filter((cell) => cell.status !== null);
      const sum = (pick: (cell: TimesheetCell) => number) => worked.reduce((totalValue, cell) => totalValue + pick(cell), 0);
      // AT-25: the group's rule decides; without one it is what the schedule gives.
      const standard = standardOf({ departmentId: employee.department.id, positionId: employee.positionId }, { units: standardUnits, minutes: standardMinutes });
      const nightMinutes = results.filter((result) => result.employeeId === employee.id).reduce((totalValue, result) => totalValue + result.nightMinutes, 0);
      return {
        employee: { id: employee.id, code: employee.code, fullName: employee.fullName, department: { id: employee.department.id, name: employee.department.name } },
        confirmation: answers.get(employee.id) ?? null,
        cells,
        totals: {
          lateCount: worked.filter((cell) => cell.lateMinutes > 0).length,
          lateMinutes: sum((cell) => cell.lateMinutes),
          earlyCount: worked.filter((cell) => cell.earlyMinutes > 0).length,
          earlyMinutes: sum((cell) => cell.earlyMinutes),
          missingPunchCount: worked.filter((cell) => cell.status === "missing_checkin" || cell.status === "missing_checkout").length,
          absentDays: worked.filter((cell) => cell.status === "absent").length,
          shiftUnits: round2(sum((cell) => cell.workUnits)),
          holidayUnits: round2(sum((cell) => cell.paidLeaveUnits)),
          nightHours: round2(nightMinutes / 60),
          outsideHours: round2(sum((cell) => cell.outsideShiftMinutes) / 60),
          standardUnits: standard.units,
          standardHours: standard.hours,
          standardMode: standard.mode,
          standardRule: standard.ruleName,
          workedHours: round2(sum((cell) => cell.workedMinutes) / 60),
          totalUnits: round2(sum((cell) => cell.workUnits + cell.paidLeaveUnits)),
          workingDays: worked.filter((cell) => cell.status !== null && WORK_STATUSES.has(cell.status)).length
        }
      };
    });

    return {
      month,
      from,
      to,
      today,
      period,
      confirmations: confirmationCounts,
      dates: dates.map((date) => {
        const holiday = holidayByDate.get(date);
        return { date, weekday: isoWeekday(date), holiday: holiday ? { name: holiday.name, type: holiday.type } : null };
      }),
      ...paginated(rows, total, query)
    };
  }
}
