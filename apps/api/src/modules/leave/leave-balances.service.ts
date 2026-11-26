import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, type LeaveBalance } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { paginated, pageArgs } from "../../common/pagination/list-query";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { localDate } from "../attendance/engine/zoned-time";
import { accrualTarget, availableOf, carryOverOf, expiringCarryOver, type BalanceTotals } from "./leave-rules";

type Client = Prisma.TransactionClient | PrismaService;

export const BALANCE_FIELDS = ["entitled", "carriedOver", "adjusted", "used", "pending", "expired"] as const;
export type BalanceField = (typeof BALANCE_FIELDS)[number];

export const ANNUAL_LEAVE_CODE = "annual";
export const CARRY_OVER_EXPIRY = "03-31";
export const LEAVE_MANAGE_PERMISSION = "permission.leave.manage";
export const BALANCE_VIEW_PERMISSIONS = ["permission.requests.view", "permission.requests.manage", LEAVE_MANAGE_PERMISSION] as const;

export type LedgerEntry = {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  field: BalanceField;
  amount: number;
  // accrual | carry_over | expire | adjust | reserve | release | use | refund | import
  kind: string;
  reason?: string | null;
  requestId?: string | null;
  sourceKey?: string | null;
  actorId?: string | null;
};

const WORKING_STATUSES = ["active", "onboarding", "offboarding"] as const;

export function totalsOf(balance: Pick<LeaveBalance, BalanceField> | null | undefined): BalanceTotals {
  return Object.fromEntries(BALANCE_FIELDS.map((field) => [field, balance ? Number(balance[field]) : 0])) as BalanceTotals;
}

function companyToday(now = new Date()) {
  return localDate(now.getTime(), "Asia/Ho_Chi_Minh");
}

// Leave balances as a ledger (LV-10 → LV-14, docs/design/approval-engine.md §7.2): every change is a
// LeaveBalanceTransaction and the totals on LeaveBalance move with it in the same transaction.
@Injectable()
export class LeaveBalancesService {
  private readonly logger = new Logger(LeaveBalancesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly dataScope: DataScopeService
  ) {}

  // Writes one ledger row. With a sourceKey the entry is written once per balance (job reruns).
  async post(tx: Client, entry: LedgerEntry): Promise<boolean> {
    if (entry.amount === 0) return false;
    const balance = await tx.leaveBalance.upsert({
      where: { employeeId_leaveTypeId_year: { employeeId: entry.employeeId, leaveTypeId: entry.leaveTypeId, year: entry.year } },
      create: { employeeId: entry.employeeId, leaveTypeId: entry.leaveTypeId, year: entry.year },
      update: {}
    });
    if (entry.sourceKey) {
      const done = await tx.leaveBalanceTransaction.findUnique({ where: { balanceId_sourceKey: { balanceId: balance.id, sourceKey: entry.sourceKey } } });
      if (done) return false;
    }
    await tx.leaveBalanceTransaction.create({
      data: {
        balanceId: balance.id,
        kind: entry.kind,
        field: entry.field,
        amount: entry.amount,
        reason: entry.reason ?? null,
        requestId: entry.requestId ?? null,
        sourceKey: entry.sourceKey ?? null,
        actorId: entry.actorId ?? null
      }
    });
    await tx.leaveBalance.update({ where: { id: balance.id }, data: { [entry.field]: { increment: entry.amount } } });
    return true;
  }

  // What a request still holds on a field, per balance year (its reserve / use rows net of releases).
  async heldBy(tx: Client, requestId: string, field: BalanceField) {
    const rows = await tx.leaveBalanceTransaction.findMany({
      where: { requestId, field },
      select: { amount: true, balance: { select: { employeeId: true, leaveTypeId: true, year: true } } }
    });
    const held = new Map<string, { employeeId: string; leaveTypeId: string; year: number; amount: number }>();
    for (const row of rows) {
      const key = `${row.balance.leaveTypeId}:${row.balance.year}`;
      const current = held.get(key) ?? { ...row.balance, amount: 0 };
      current.amount = Math.round((current.amount + Number(row.amount)) * 100) / 100;
      held.set(key, current);
    }
    return [...held.values()].filter((item) => item.amount !== 0);
  }

  async available(tx: Client, employeeId: string, leaveTypeId: string, year: number) {
    const balance = await tx.leaveBalance.findUnique({ where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } } });
    return availableOf(totalsOf(balance));
  }

  // LV-10.
  async mine(user: AuthenticatedUser, year = Number(companyToday().slice(0, 4))) {
    const employeeId = user.account?.employeeId;
    if (!employeeId) throw new ForbiddenException("Tài khoản chưa gắn hồ sơ nhân sự.");
    return { year, balances: await this.balancesFor([employeeId], year).then((map) => map.get(employeeId) ?? []) };
  }

  // LV-11: people in the viewer's scope with their balances of types that use a balance.
  async list(user: AuthenticatedUser, query: { year?: number; q?: string; departmentId?: string; page?: number; limit?: number }) {
    const account = user.account;
    if (!account) throw new ForbiddenException();
    if (account.adminRole !== "system_admin" && (await this.dataScope.grantsFor(account.id, BALANCE_VIEW_PERMISSIONS)).length === 0) {
      throw new ForbiddenException("Bạn không có quyền xem quỹ phép của người khác.");
    }
    const scope = await this.dataScope.resolve(user, BALANCE_VIEW_PERMISSIONS);
    const year = query.year ?? Number(companyToday().slice(0, 4));
    const where: Prisma.EmployeeWhereInput = {
      AND: [
        this.dataScope.employeeWhere(scope),
        { status: { in: [...WORKING_STATUSES] } },
        query.departmentId ? { departmentId: query.departmentId } : {},
        query.q?.trim() ? { OR: [{ fullName: { contains: query.q.trim(), mode: "insensitive" } }, { code: { contains: query.q.trim(), mode: "insensitive" } }] } : {}
      ]
    };
    const { skip, take } = pageArgs(query);
    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        select: { id: true, code: true, fullName: true, avatarUrl: true, department: { select: { id: true, name: true } } },
        orderBy: { fullName: "asc" },
        skip,
        take
      }),
      this.prisma.employee.count({ where })
    ]);
    const balances = await this.balancesFor(employees.map((item) => item.id), year);
    return { year, ...paginated(employees.map((employee) => ({ employee, balances: balances.get(employee.id) ?? [] })), total, query) };
  }

  // LV-12: HR adds or removes days with a reason, for someone in scope.
  async adjust(user: AuthenticatedUser, dto: { employeeId: string; leaveTypeId: string; year: number; amount: number; reason: string }) {
    if (!dto.reason?.trim()) throw new BadRequestException("Hãy nhập lý do điều chỉnh.");
    if (!Number.isFinite(dto.amount) || dto.amount === 0 || Math.abs(dto.amount) > 365) throw new BadRequestException("Số ngày điều chỉnh không hợp lệ.");
    const scope = await this.dataScope.resolve(user, [LEAVE_MANAGE_PERMISSION]);
    await this.dataScope.assertEmployeeInScope(scope, dto.employeeId);
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: dto.leaveTypeId } });
    if (!leaveType) throw new NotFoundException("Không tìm thấy loại nghỉ.");
    if (!leaveType.deductsBalance) throw new BadRequestException("Loại nghỉ này không dùng quỹ phép.");

    const actorId = user.account?.employeeId ?? null;
    await this.prisma.$transaction(async (tx) => {
      await this.post(tx, { employeeId: dto.employeeId, leaveTypeId: dto.leaveTypeId, year: dto.year, field: "adjusted", amount: Math.round(dto.amount * 100) / 100, kind: "adjust", reason: dto.reason.trim(), actorId });
      await tx.auditLog.create({
        data: {
          ...this.audit.contextFields(),
          actorId: actorId ?? undefined,
          action: "leave_balance.adjust",
          entityType: "LeaveBalance",
          entityId: `${dto.employeeId}:${dto.leaveTypeId}:${dto.year}`,
          afterValue: { amount: dto.amount, reason: dto.reason.trim(), year: dto.year, leaveType: leaveType.code }
        }
      });
    });
    return { year: dto.year, balances: (await this.balancesFor([dto.employeeId], dto.year)).get(dto.employeeId) ?? [] };
  }

  async transactions(user: AuthenticatedUser, employeeId: string, year: number) {
    if (employeeId !== user.account?.employeeId) {
      const account = user.account;
      if (!account) throw new ForbiddenException();
      if (account.adminRole !== "system_admin" && (await this.dataScope.grantsFor(account.id, BALANCE_VIEW_PERMISSIONS)).length === 0) {
        throw new ForbiddenException("Bạn không có quyền xem quỹ phép của người khác.");
      }
      await this.dataScope.assertEmployeeInScope(await this.dataScope.resolve(user, BALANCE_VIEW_PERMISSIONS), employeeId);
    }
    return this.prisma.leaveBalanceTransaction.findMany({
      where: { balance: { employeeId, year } },
      include: { balance: { select: { leaveType: { select: { code: true, name: true } } } } },
      orderBy: { createdAt: "desc" }
    });
  }

  // LV-13 / LV-14, run by the worker every hour; every entry has a sourceKey so reruns change nothing.
  async tick(now = new Date()) {
    const today = companyToday(now);
    const year = Number(today.slice(0, 4));
    const month = Number(today.slice(5, 7));
    const annual = await this.prisma.leaveType.findUnique({ where: { code: ANNUAL_LEAVE_CODE } });
    if (!annual || annual.status !== "active") return { accrued: 0, carried: 0, expired: 0 };

    const employees = await this.prisma.employee.findMany({
      where: { OR: [{ status: { in: [...WORKING_STATUSES] } }, { endDate: { gte: new Date(`${year}-01-01T00:00:00.000Z`) } }] },
      select: { id: true, startDate: true, endDate: true }
    });
    const balances = await this.prisma.leaveBalance.findMany({ where: { leaveTypeId: annual.id, year: { in: [year - 1, year] } } });
    const balanceOf = (employeeId: string, forYear: number) => balances.find((item) => item.employeeId === employeeId && item.year === forYear);
    let accrued = 0;
    let carried = 0;
    let expired = 0;
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;

    for (const employee of employees) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const person = { startDate: localDate(employee.startDate.getTime(), "Asia/Ho_Chi_Minh"), endDate: employee.endDate ? localDate(employee.endDate.getTime(), "Asia/Ho_Chi_Minh") : null };
          const current = balanceOf(employee.id, year);
          const delta = Math.round((accrualTarget(person, year, month) - Number(current?.entitled ?? 0)) * 100) / 100;
          if (await this.post(tx, { employeeId: employee.id, leaveTypeId: annual.id, year, field: "entitled", amount: delta, kind: "accrual", reason: `Cộng phép tháng ${monthKey}`, sourceKey: `accrual:${monthKey}` })) accrued++;

          const previous = balanceOf(employee.id, year - 1);
          const carry = carryOverOf(totalsOf(previous));
          if (previous && carry > 0 && (await this.post(tx, { employeeId: employee.id, leaveTypeId: annual.id, year, field: "carriedOver", amount: carry, kind: "carry_over", reason: `Phép tồn năm ${year - 1}`, sourceKey: `carry:${year - 1}` }))) {
            await tx.leaveBalance.update({
              where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: annual.id, year } },
              data: { carryOverExpiresAt: new Date(`${year}-${CARRY_OVER_EXPIRY}T00:00:00.000Z`) }
            });
            carried++;
          }

          const fresh = await tx.leaveBalance.findUnique({ where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: annual.id, year } } });
          if (fresh?.carryOverExpiresAt && fresh.carryOverExpiresAt.toISOString().slice(0, 10) < today) {
            const amount = expiringCarryOver(totalsOf(fresh));
            if (await this.post(tx, { employeeId: employee.id, leaveTypeId: annual.id, year, field: "expired", amount, kind: "expire", reason: `Phép tồn hết hạn ${fresh.carryOverExpiresAt.toISOString().slice(0, 10)}`, sourceKey: `expire:${year}` })) expired++;
          }
        });
      } catch (error) {
        this.logger.warn(`Leave accrual failed for employee ${employee.id}: ${error instanceof Error ? error.message : error}`);
      }
    }
    return { accrued, carried, expired };
  }

  private async balancesFor(employeeIds: string[], year: number) {
    const [types, balances] = await Promise.all([
      this.prisma.leaveType.findMany({ where: { deductsBalance: true, status: "active" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      this.prisma.leaveBalance.findMany({ where: { employeeId: { in: employeeIds }, year } })
    ]);
    const result = new Map<string, Array<Record<string, unknown>>>();
    for (const employeeId of employeeIds) {
      result.set(
        employeeId,
        types.map((type) => {
          const balance = balances.find((item) => item.employeeId === employeeId && item.leaveTypeId === type.id);
          const totals = totalsOf(balance);
          return {
            leaveType: { id: type.id, code: type.code, name: type.name },
            ...totals,
            available: availableOf(totals),
            carryOverExpiresAt: balance?.carryOverExpiresAt?.toISOString().slice(0, 10) ?? null
          };
        })
      );
    }
    return result;
  }
}
