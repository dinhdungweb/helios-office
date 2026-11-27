import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AttendanceAdjustmentType, Prisma } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import { AttendancePeriodService } from "./attendance-period.service";
import type { AdjustAttendanceDto, RevokeAdjustmentDto } from "./attendance-adjustment.dto";
import { zonedInstant } from "./engine/zoned-time";

// HR's manual changes to a calculated day (AT-15, design §7). Each change is an
// AttendanceAdjustment the engine applies last, so recalculations keep it; a new change is merged
// with the active one, which is then revoked, so earlier edits are not lost. Locked periods are
// refused once AT-17 adds period locking.

export const ATTENDANCE_EDIT_PERMISSIONS = ["permission.attendance.manage"];
const ATTENDANCE_DETAIL_PERMISSIONS = ["permission.attendance.view", "permission.attendance.manage", "permission.attendance-timesheets.view", "permission.attendance-timesheets.manage"];

const isoDate = (value: Date) => value.toISOString().slice(0, 10);

@Injectable()
export class AttendanceAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScope: DataScopeService,
    private readonly calculation: AttendanceCalculationService,
    private readonly audit: AuditService,
    private readonly periods: AttendancePeriodService
  ) {}

  // One day with its shift and every manual change ever made to it, newest first.
  async detail(user: AuthenticatedUser, id: string) {
    const day = await this.findInScope(user, id, ATTENDANCE_DETAIL_PERMISSIONS);
    const [adjustments, logs] = await Promise.all([
      this.prisma.attendanceAdjustment.findMany({
        where: { employeeId: day.employeeId, workDate: day.workDate },
        orderBy: { createdAt: "desc" }
      }),
      this.punchesFor(day)
    ]);
    // Who changed it: an employee, or an account without an employee profile (e.g. a system admin).
    const actorIds = [...new Set(adjustments.flatMap((item) => [item.createdById, item.revokedById]).filter((value): value is string => Boolean(value)))];
    const [people, accounts] = await Promise.all([
      this.prisma.employee.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true } }),
      this.prisma.userAccount.findMany({ where: { id: { in: actorIds } }, select: { id: true, displayName: true } })
    ]);
    const names = new Map([...accounts.map((account) => [account.id, account.displayName] as const), ...people.map((person) => [person.id, person.fullName] as const)]);

    const { policySnapshot, workUnits, paidLeaveUnits, workDate, ...rest } = day;
    return {
      ...rest,
      workDate: isoDate(workDate),
      workUnits: Number(workUnits),
      paidLeaveUnits: Number(paidLeaveUnits),
      rules: policySnapshot,
      punches: logs,
      adjustments: adjustments.map((item) => ({
        id: item.id,
        type: item.type,
        checkIn: item.punchesSet ? item.checkIn : undefined,
        checkOut: item.punchesSet ? item.checkOut : undefined,
        punchesSet: item.punchesSet,
        workUnits: item.workUnits === null ? null : Number(item.workUnits),
        status: item.status,
        reason: item.reason,
        before: item.before,
        createdAt: item.createdAt,
        createdBy: item.createdById ? names.get(item.createdById) ?? null : null,
        revokedAt: item.revokedAt,
        revokedBy: item.revokedById ? names.get(item.revokedById) ?? null : null,
        active: item.revokedAt === null
      }))
    };
  }

  async adjust(user: AuthenticatedUser, id: string, dto: AdjustAttendanceDto) {
    const day = await this.findInScope(user, id, ATTENDANCE_EDIT_PERMISSIONS);
    await this.periods.assertOpen([isoDate(day.workDate)]);
    const changesPunches = dto.checkIn !== undefined || dto.checkOut !== undefined;
    if (!changesPunches && dto.workUnits === undefined && dto.status === undefined) {
      throw new BadRequestException("Chưa có thay đổi nào để lưu.");
    }

    const timeZone = await this.calculation.timezone();
    const toInstant = (value: string | null) => (value === null ? null : new Date(zonedInstant(value.slice(0, 10), Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16)), timeZone)));
    // Only HR's own changes; approved requests' adjustments (leave...) stay (AT-22).
    const active = await this.prisma.attendanceAdjustment.findFirst({
      where: { employeeId: day.employeeId, workDate: day.workDate, revokedAt: null, type: AttendanceAdjustmentType.manual },
      orderBy: { createdAt: "desc" }
    });

    // Punches: a field sent replaces that punch; the other keeps HR's earlier value, else the day's.
    const punchesSet = changesPunches || Boolean(active?.punchesSet);
    const checkIn = dto.checkIn !== undefined ? toInstant(dto.checkIn) : active?.punchesSet ? active.checkIn : day.checkIn;
    const checkOut = dto.checkOut !== undefined ? toInstant(dto.checkOut) : active?.punchesSet ? active.checkOut : day.checkOut;
    if (punchesSet && checkIn && checkOut && checkOut <= checkIn) throw new BadRequestException("Giờ ra phải sau giờ vào.");

    const actorId = user.account?.employeeId ?? undefined;
    const changedBy = actorId ?? user.account?.id ?? null;
    const before = this.snapshot(day);
    const [adjustment] = await this.prisma.$transaction([
      this.prisma.attendanceAdjustment.create({
        data: {
          employeeId: day.employeeId,
          workDate: day.workDate,
          type: AttendanceAdjustmentType.manual,
          punchesSet,
          checkIn: punchesSet ? checkIn : null,
          checkOut: punchesSet ? checkOut : null,
          workUnits: dto.workUnits !== undefined ? (dto.workUnits === null ? null : new Prisma.Decimal(dto.workUnits)) : active?.workUnits ?? null,
          status: dto.status !== undefined ? dto.status : active?.status ?? null,
          reason: dto.reason.trim(),
          before,
          createdById: changedBy
        }
      }),
      ...(active ? [this.prisma.attendanceAdjustment.update({ where: { id: active.id }, data: { revokedAt: new Date(), revokedById: changedBy } })] : [])
    ]);

    await this.calculation.recalculate({ from: isoDate(day.workDate), to: isoDate(day.workDate), employeeIds: [day.employeeId], source: "manual" });
    await this.writeAudit("attendance.adjust", id, before, { adjustmentId: adjustment.id, ...dto }, actorId);
    return this.detail(user, id);
  }

  // "Bỏ sửa tay": the day goes back to what the engine computes from the punches.
  async revoke(user: AuthenticatedUser, id: string, dto: RevokeAdjustmentDto) {
    const day = await this.findInScope(user, id, ATTENDANCE_EDIT_PERMISSIONS);
    await this.periods.assertOpen([isoDate(day.workDate)]);
    const actorId = user.account?.employeeId ?? undefined;
    const result = await this.prisma.attendanceAdjustment.updateMany({
      where: { employeeId: day.employeeId, workDate: day.workDate, revokedAt: null, type: AttendanceAdjustmentType.manual },
      data: { revokedAt: new Date(), revokedById: actorId ?? user.account?.id ?? null }
    });
    if (result.count === 0) throw new BadRequestException("Ngày này không có sửa tay để bỏ.");

    await this.calculation.recalculate({ from: isoDate(day.workDate), to: isoDate(day.workDate), employeeIds: [day.employeeId], source: "manual" });
    await this.writeAudit("attendance.adjust_revoke", id, this.snapshot(day), { reason: dto.reason ?? null }, actorId);
    return this.detail(user, id);
  }

  private async findInScope(user: AuthenticatedUser, id: string, permissions: string[]) {
    const scope = await this.dataScope.resolve(user, permissions);
    const day = await this.prisma.attendanceDay.findFirst({
      where: { id, employee: this.dataScope.employeeWhere(scope) },
      include: {
        employee: { select: { id: true, code: true, fullName: true, department: { select: { id: true, name: true } } } },
        shift: { select: { id: true, code: true, name: true, color: true, startMinute: true, endMinute: true, breakStartMinute: true, breakEndMinute: true } }
      }
    });
    if (!day) throw new NotFoundException("Không tìm thấy ngày công hoặc ngày này ngoài phạm vi của bạn.");
    return day;
  }

  // Raw punches around the day (from 12 hours before the shift to 12 hours after), for HR to compare.
  private async punchesFor(day: { employeeId: string; workDate: Date; scheduledStart: Date | null; scheduledEnd: Date | null }) {
    const timeZone = await this.calculation.timezone();
    const date = isoDate(day.workDate);
    const from = day.scheduledStart ? new Date(day.scheduledStart.getTime() - 12 * 3_600_000) : new Date(zonedInstant(date, 0, timeZone));
    const to = day.scheduledEnd ? new Date(day.scheduledEnd.getTime() + 12 * 3_600_000) : new Date(zonedInstant(date, 1440, timeZone));
    const logs = await this.prisma.attendanceRawLog.findMany({
      where: { employeeId: day.employeeId, punchTime: { gte: from, lt: to } },
      select: { punchTime: true, deviceId: true, verifyType: true, source: true, direction: true, clientDeviceName: true, locationName: true, photoFileId: true },
      orderBy: { punchTime: "asc" }
    });
    return logs;
  }

  private snapshot(day: { checkIn: Date | null; checkOut: Date | null; workUnits: Prisma.Decimal; status: string; lateMinutes: number; earlyMinutes: number; workedMinutes: number }) {
    return {
      checkIn: day.checkIn,
      checkOut: day.checkOut,
      workUnits: Number(day.workUnits),
      status: day.status,
      lateMinutes: day.lateMinutes,
      earlyMinutes: day.earlyMinutes,
      workedMinutes: day.workedMinutes
    };
  }

  private async writeAudit(action: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    const json = (value: unknown) => (value === null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue));
    await this.prisma.auditLog.create({
      data: { ...this.audit.contextFields(), actorId, action, entityType: "AttendanceDay", entityId, beforeValue: json(before), afterValue: json(after) }
    });
  }
}
