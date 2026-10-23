import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { AttendancePeriodStatus, Prisma } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { addDays } from "./engine/zoned-time";

// Attendance periods (AT-17, design §8): a locked month cannot change any more. Manual changes and
// schedule edits are refused, and recalculations skip its days. Locking also stamps the payroll
// cycles that cover the month.

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthLabel(month: string) {
  return `${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;
}

export function monthBounds(month: string) {
  const from = `${month}-01`;
  return { from, to: addDays(`${addDays(from, 31).slice(0, 7)}-01`, -1) };
}

@Injectable()
export class AttendancePeriodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async lockedMonths(months: string[]) {
    if (months.length === 0) return new Set<string>();
    const rows = await this.prisma.attendancePeriod.findMany({
      where: { month: { in: [...new Set(months)] }, status: AttendancePeriodStatus.locked },
      select: { month: true }
    });
    return new Set(rows.map((row) => row.month));
  }

  // Refuses a change touching any date (YYYY-MM-DD) of a locked month.
  async assertOpen(dates: string[]) {
    const locked = [...(await this.lockedMonths(dates.map((date) => date.slice(0, 7))))].sort();
    if (locked.length > 0) {
      throw new ConflictException(`Kỳ công tháng ${locked.map(monthLabel).join(", ")} đã chốt. Mở chốt kỳ công trước khi thay đổi.`);
    }
  }

  // Every month from `from` to `to` (YYYY-MM-DD), for range checks.
  async assertRangeOpen(from: string, to: string) {
    const months: string[] = [];
    for (let month = from.slice(0, 7); month <= to.slice(0, 7); month = addDays(`${month}-01`, 31).slice(0, 7)) months.push(month);
    await this.assertOpen(months.map((month) => `${month}-01`));
  }

  async view(month: string) {
    this.checkMonth(month);
    const period = await this.prisma.attendancePeriod.findUnique({ where: { month } });
    if (!period) {
      return { month, status: AttendancePeriodStatus.open, lockedAt: null, lockedBy: null, note: null, unlockedAt: null, unlockedBy: null, unlockReason: null, confirmationOpen: false };
    }

    const names = await this.names([period.lockedById, period.unlockedById]);
    return {
      month,
      status: period.status,
      lockedAt: period.lockedAt,
      lockedBy: period.lockedById ? names.get(period.lockedById) ?? null : null,
      note: period.note,
      unlockedAt: period.unlockedAt,
      unlockedBy: period.unlockedById ? names.get(period.unlockedById) ?? null : null,
      unlockReason: period.unlockReason,
      confirmationOpen: Boolean(period.confirmationOpenedAt)
    };
  }

  async lock(user: AuthenticatedUser, month: string, note?: string) {
    this.checkMonth(month);
    const before = await this.prisma.attendancePeriod.findUnique({ where: { month } });
    if (before?.status === AttendancePeriodStatus.locked) throw new ConflictException(`Kỳ công tháng ${monthLabel(month)} đã chốt rồi.`);

    const actor = this.actor(user);
    const now = new Date();
    const { from, to } = monthBounds(month);
    await this.prisma.$transaction([
      this.prisma.attendancePeriod.upsert({
        where: { month },
        create: { month, status: AttendancePeriodStatus.locked, lockedAt: now, lockedById: actor, note: note?.trim() || null },
        update: { status: AttendancePeriodStatus.locked, lockedAt: now, lockedById: actor, note: note?.trim() || null }
      }),
      // Payroll cycles that cover any part of the month now read locked attendance.
      this.prisma.payrollCycle.updateMany({
        where: { periodStart: { lte: new Date(`${to}T23:59:59.999Z`) }, periodEnd: { gte: new Date(`${from}T00:00:00.000Z`) } },
        data: { lockedAttendanceAt: now }
      })
    ]);
    await this.writeAudit("attendance_period.lock", month, before, { status: "locked", note: note ?? null }, user.account?.employeeId ?? undefined);
    return this.view(month);
  }

  async unlock(user: AuthenticatedUser, month: string, reason: string) {
    this.checkMonth(month);
    if (!reason?.trim() || reason.trim().length < 3) throw new BadRequestException("Nhập lý do mở chốt.");
    const before = await this.prisma.attendancePeriod.findUnique({ where: { month } });
    if (before?.status !== AttendancePeriodStatus.locked) throw new ConflictException(`Kỳ công tháng ${monthLabel(month)} đang mở.`);

    const { from, to } = monthBounds(month);
    await this.prisma.$transaction([
      this.prisma.attendancePeriod.update({
        where: { month },
        data: { status: AttendancePeriodStatus.open, unlockedAt: new Date(), unlockedById: this.actor(user), unlockReason: reason.trim() }
      }),
      this.prisma.payrollCycle.updateMany({
        where: { periodStart: { lte: new Date(`${to}T23:59:59.999Z`) }, periodEnd: { gte: new Date(`${from}T00:00:00.000Z`) } },
        data: { lockedAttendanceAt: null }
      })
    ]);
    await this.writeAudit("attendance_period.unlock", month, before, { status: "open", reason: reason.trim() }, user.account?.employeeId ?? undefined);
    return this.view(month);
  }

  private checkMonth(month: string) {
    if (!MONTH.test(month)) throw new BadRequestException("Tháng phải có dạng YYYY-MM.");
  }

  // Employee id, or the account id for an account without an employee profile.
  private actor(user: AuthenticatedUser) {
    return user.account?.employeeId ?? user.account?.id ?? null;
  }

  private async names(ids: Array<string | null>) {
    const wanted = ids.filter((id): id is string => Boolean(id));
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
      data: { ...this.audit.contextFields(), actorId, action, entityType: "AttendancePeriod", entityId, beforeValue: json(before), afterValue: json(after) }
    });
  }
}
