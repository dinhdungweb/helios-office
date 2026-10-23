import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AttendanceConfirmationStatus, AttendancePeriodStatus, Prisma } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { StandardWorkdayService } from "./standard-workdays.service";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import { monthBounds } from "./attendance-period.service";
import { localDate, zonedInstant } from "./engine/zoned-time";

// Employees confirm their month (AT-24, design §8): HR opens confirmation for a month, each person
// confirms or sends feedback until the month is locked, and HR records how feedback was handled.
// With the policy's requireTimesheetConfirmation on, a month cannot be locked while anyone
// employed in it has not confirmed.

export const CONFIRMATION_MANAGE_PERMISSIONS = ["permission.attendance-timesheets.manage", "permission.attendance.manage"];

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const dbDate = (date: string) => new Date(`${date}T00:00:00.000Z`);

function monthLabel(month: string) {
  return `${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;
}

export type ConfirmationView = {
  status: AttendanceConfirmationStatus;
  feedback: string | null;
  respondedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: string | null;
};

@Injectable()
export class AttendanceConfirmationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScope: DataScopeService,
    private readonly calculation: AttendanceCalculationService,
    private readonly audit: AuditService,
    private readonly standards: StandardWorkdayService
  ) {}

  // GET /attendance/me/timesheet: my month's totals, whether I can answer, and my answer.
  async myMonth(user: AuthenticatedUser, month?: string) {
    const employeeId = user.account?.employeeId;
    if (!employeeId) throw new NotFoundException("Tài khoản của bạn chưa gắn với hồ sơ nhân sự.");
    const timeZone = await this.calculation.timezone();
    const target = month ?? localDate(Date.now(), timeZone).slice(0, 7);
    this.checkMonth(target);
    const { from, to } = monthBounds(target);

    const [period, confirmation, days, employee, standardOf] = await Promise.all([
      this.prisma.attendancePeriod.findUnique({ where: { month: target } }),
      this.prisma.attendanceConfirmation.findUnique({ where: { employeeId_month: { employeeId, month: target } } }),
      this.prisma.attendanceDay.findMany({ where: { employeeId, workDate: { gte: dbDate(from), lte: dbDate(to) } } }),
      this.prisma.employee.findUnique({ where: { id: employeeId }, select: { departmentId: true, positionId: true } }),
      this.standards.resolverFor(target)
    ]);
    // AT-25: a group rule's standard; null means the board counts the scheduled shifts itself.
    const rule = employee ? standardOf({ departmentId: employee.departmentId, positionId: employee.positionId }, { units: 0, minutes: 0 }) : null;
    const standard = rule && rule.mode !== "schedule" ? { units: rule.units, hours: rule.hours, rule: rule.ruleName } : null;
    const sum = (pick: (day: (typeof days)[number]) => number) => days.reduce((total, day) => total + pick(day), 0);
    const round = (value: number) => Math.round(value * 100) / 100;

    return {
      month: target,
      locked: period?.status === AttendancePeriodStatus.locked,
      confirmationOpen: Boolean(period?.confirmationOpenedAt) && period?.status !== AttendancePeriodStatus.locked,
      confirmation: confirmation ? await this.view(confirmation) : null,
      standard,
      totals: {
        workUnits: round(sum((day) => Number(day.workUnits))),
        holidayUnits: round(sum((day) => Number(day.paidLeaveUnits))),
        workedHours: round(sum((day) => day.workedMinutes) / 60),
        lateCount: days.filter((day) => day.lateMinutes > 0).length,
        lateMinutes: sum((day) => day.lateMinutes),
        earlyCount: days.filter((day) => day.earlyMinutes > 0).length,
        earlyMinutes: sum((day) => day.earlyMinutes),
        missingPunchCount: days.filter((day) => day.status === "missing_checkin" || day.status === "missing_checkout").length,
        absentDays: days.filter((day) => day.status === "absent").length
      }
    };
  }

  // POST /attendance/me/timesheet/:month/confirm
  async answer(user: AuthenticatedUser, month: string, action: "confirm" | "feedback", feedback?: string) {
    const employeeId = user.account?.employeeId;
    if (!employeeId) throw new NotFoundException("Tài khoản của bạn chưa gắn với hồ sơ nhân sự.");
    this.checkMonth(month);
    const period = await this.prisma.attendancePeriod.findUnique({ where: { month } });
    if (period?.status === AttendancePeriodStatus.locked) throw new ConflictException(`Kỳ công tháng ${monthLabel(month)} đã chốt, không xác nhận được nữa.`);
    if (!period?.confirmationOpenedAt) throw new ConflictException(`HR chưa mở xác nhận công tháng ${monthLabel(month)}.`);
    const text = feedback?.trim() ?? "";
    if (action === "feedback" && text.length < 3) throw new BadRequestException("Nhập nội dung phản hồi.");

    const status = action === "confirm" ? AttendanceConfirmationStatus.confirmed : AttendanceConfirmationStatus.feedback;
    const data = { status, feedback: action === "feedback" ? text : null, respondedAt: new Date(), resolvedAt: null, resolvedById: null, resolution: null };
    const saved = await this.prisma.attendanceConfirmation.upsert({
      where: { employeeId_month: { employeeId, month } },
      create: { employeeId, month, ...data },
      update: data
    });
    await this.writeAudit(`attendance_confirmation.${action}`, `${employeeId}:${month}`, null, { status, feedback: data.feedback }, employeeId);
    return this.view(saved);
  }

  // POST /attendance/timesheets/:month/confirmation: HR opens or closes confirmation for a month.
  async setOpen(user: AuthenticatedUser, month: string, open: boolean) {
    this.checkMonth(month);
    const period = await this.prisma.attendancePeriod.findUnique({ where: { month } });
    if (period?.status === AttendancePeriodStatus.locked) throw new ConflictException(`Kỳ công tháng ${monthLabel(month)} đã chốt.`);
    const actor = user.account?.employeeId ?? user.account?.id ?? null;
    const data = open ? { confirmationOpenedAt: new Date(), confirmationOpenedById: actor } : { confirmationOpenedAt: null, confirmationOpenedById: null };
    await this.prisma.attendancePeriod.upsert({ where: { month }, create: { month, ...data }, update: data });
    await this.writeAudit(open ? "attendance_confirmation.open" : "attendance_confirmation.close", month, null, { open }, user.account?.employeeId ?? undefined);
    return { month, confirmationOpen: open };
  }

  // HR records how a person's feedback was handled.
  async resolve(user: AuthenticatedUser, month: string, employeeId: string, resolution: string) {
    this.checkMonth(month);
    const scope = await this.dataScope.resolve(user, CONFIRMATION_MANAGE_PERMISSIONS);
    const visible = await this.prisma.employee.count({ where: { AND: [{ id: employeeId }, this.dataScope.employeeWhere(scope)] } });
    if (!visible) throw new NotFoundException("Không tìm thấy nhân sự hoặc nhân sự ngoài phạm vi của bạn.");
    if (!resolution?.trim() || resolution.trim().length < 3) throw new BadRequestException("Nhập cách đã xử lý phản hồi.");

    const current = await this.prisma.attendanceConfirmation.findUnique({ where: { employeeId_month: { employeeId, month } } });
    if (!current || current.status !== AttendanceConfirmationStatus.feedback) throw new BadRequestException("Nhân sự này không có phản hồi cần xử lý.");
    const saved = await this.prisma.attendanceConfirmation.update({
      where: { id: current.id },
      data: { resolvedAt: new Date(), resolvedById: user.account?.employeeId ?? user.account?.id ?? null, resolution: resolution.trim() }
    });
    await this.writeAudit("attendance_confirmation.resolve", `${employeeId}:${month}`, current, { resolution: saved.resolution }, user.account?.employeeId ?? undefined);
    return this.view(saved);
  }

  // Answers for a page of employees, for the timesheet.
  async byEmployee(month: string, employeeIds: string[]) {
    const rows = await this.prisma.attendanceConfirmation.findMany({ where: { month, employeeId: { in: employeeIds } } });
    const names = await this.names(rows.map((row) => row.resolvedById));
    return new Map(rows.map((row) => [row.employeeId, this.toView(row, names)]));
  }

  // Month-wide counts for the people in the caller's scope employed in the month.
  async counts(month: string, employeeWhere: Prisma.EmployeeWhereInput) {
    const timeZone = await this.calculation.timezone();
    const { from, to } = monthBounds(month);
    const employed: Prisma.EmployeeWhereInput = {
      AND: [
        employeeWhere,
        { startDate: { lt: new Date(zonedInstant(to, 1440, timeZone)) } },
        { OR: [{ endDate: null }, { endDate: { gte: new Date(zonedInstant(from, 0, timeZone)) } }] }
      ]
    };
    const [people, answers] = await Promise.all([
      this.prisma.employee.count({ where: employed }),
      this.prisma.attendanceConfirmation.groupBy({ by: ["status"], where: { month, employee: employed }, _count: { _all: true } })
    ]);
    const confirmed = answers.find((row) => row.status === AttendanceConfirmationStatus.confirmed)?._count._all ?? 0;
    const feedback = answers.find((row) => row.status === AttendanceConfirmationStatus.feedback)?._count._all ?? 0;
    return { people, confirmed, feedback, pending: Math.max(0, people - confirmed - feedback) };
  }

  // Lock guard: with the policy on, everyone employed in the month must have confirmed.
  async assertConfirmedForLock(month: string) {
    const policy = await this.calculation.getPolicy();
    if (!policy.requireTimesheetConfirmation) return;
    const counts = await this.counts(month, {});
    const missing = counts.people - counts.confirmed;
    if (missing > 0) {
      throw new ConflictException(`Còn ${missing} người chưa xác nhận công tháng ${monthLabel(month)} (chính sách yêu cầu xác nhận trước khi chốt).`);
    }
  }

  private checkMonth(month: string) {
    if (!MONTH.test(month)) throw new BadRequestException("Tháng phải có dạng YYYY-MM.");
  }

  private async view(row: Prisma.AttendanceConfirmationGetPayload<object>) {
    return this.toView(row, await this.names([row.resolvedById]));
  }

  private toView(row: Prisma.AttendanceConfirmationGetPayload<object>, names: Map<string, string>): ConfirmationView {
    return {
      status: row.status,
      feedback: row.feedback,
      respondedAt: row.respondedAt,
      resolvedAt: row.resolvedAt,
      resolvedBy: row.resolvedById ? names.get(row.resolvedById) ?? null : null,
      resolution: row.resolution
    };
  }

  private async names(ids: Array<string | null>) {
    const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (wanted.length === 0) return new Map<string, string>();
    const [people, accounts] = await Promise.all([
      this.prisma.employee.findMany({ where: { id: { in: wanted } }, select: { id: true, fullName: true } }),
      this.prisma.userAccount.findMany({ where: { id: { in: wanted } }, select: { id: true, displayName: true } })
    ]);
    return new Map([...accounts.map((account) => [account.id, account.displayName] as const), ...people.map((person) => [person.id, person.fullName] as const)]);
  }

  private async writeAudit(action: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    const json = (value: unknown) => (value === null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue));
    await this.prisma.auditLog.create({
      data: { ...this.audit.contextFields(), actorId, action, entityType: "AttendanceConfirmation", entityId, beforeValue: json(before), afterValue: json(after) }
    });
  }
}
