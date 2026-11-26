import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common";
import type { Prisma, Request } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RequestTypeRegistry, type ConditionFieldDef, type HandlerContext, type RequestSummary, type RequestTypeHandler } from "../approvals/engine/request-types";
import { localDate } from "../attendance/engine/zoned-time";
import { LeaveBalancesService } from "./leave-balances.service";
import { leaveUnits, unitsByYear, type LeaveDay, type LeaveRange, type MinUnit } from "./leave-rules";
import { LeaveScheduleService } from "./leave-schedule.service";
import { LeavePayloadDto } from "./leave.dto";

type Tx = Prisma.TransactionClient;

// What a leave request stores in Request.payload once prepared.
export type LeavePayload = {
  leaveTypeCode: string;
  leaveTypeName: string;
  paid: boolean;
  deductsBalance: boolean;
  ranges: LeaveRange[];
  reason: string | null;
  days: LeaveDay[];
};

export function leavePayloadOf(request: Pick<Request, "payload">): LeavePayload {
  const payload = (request.payload ?? {}) as Partial<LeavePayload>;
  return {
    leaveTypeCode: payload.leaveTypeCode ?? "",
    leaveTypeName: payload.leaveTypeName ?? "",
    paid: payload.paid ?? false,
    deductsBalance: payload.deductsBalance ?? false,
    ranges: payload.ranges ?? [],
    reason: payload.reason ?? null,
    days: payload.days ?? []
  };
}

const round2 = (value: number) => Math.round(value * 100) / 100;

// The "leave" request type (LV-09 → LV-16, docs/design/approval-engine.md §6–7).
@Injectable()
export class LeaveRequestHandler implements RequestTypeHandler<LeavePayload>, OnModuleInit {
  readonly type = "leave" as const;

  constructor(
    private readonly registry: RequestTypeRegistry,
    private readonly balances: LeaveBalancesService,
    private readonly schedule: LeaveScheduleService
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async prepare(raw: unknown, context: HandlerContext & { requestId?: string }): Promise<{ payload: LeavePayload; summary: RequestSummary }> {
    const dto = plainToInstance(LeavePayloadDto, raw ?? {});
    const problems = await validate(dto, { whitelist: true });
    if (problems.length > 0) throw new BadRequestException("Thông tin đơn nghỉ chưa hợp lệ: cần loại nghỉ và ít nhất một khoảng thời gian (ngày YYYY-MM-DD, giờ HH:mm).");

    const { tx, requesterId } = context;
    const leaveType = await tx.leaveType.findUnique({ where: { code: dto.leaveTypeCode } });
    if (!leaveType || leaveType.status !== "active") throw new BadRequestException("Loại nghỉ không tồn tại hoặc đã ngừng sử dụng.");

    const from = dto.ranges.map((range) => range.fromDate).sort()[0];
    const to = dto.ranges.map((range) => range.toDate).sort().at(-1)!;
    const shiftOn = await this.schedule.load(tx, requesterId, from, to);
    const computed = leaveUnits(dto.ranges, shiftOn, leaveType.minUnit as MinUnit);
    if (computed.errors.length > 0) throw new BadRequestException(computed.errors[0]);
    if (computed.total <= 0) throw new BadRequestException("Khoảng thời gian đã chọn không có ngày làm việc nào.");
    if (leaveType.maxDaysPerRequest !== null && computed.total > Number(leaveType.maxDaysPerRequest)) {
      throw new BadRequestException(`${leaveType.name} tối đa ${Number(leaveType.maxDaysPerRequest)} ngày mỗi đơn.`);
    }

    await this.assertNoOverlap(tx, requesterId, computed.days, from, to, context.requestId, shiftOn);
    await this.assertPeriodsOpen(tx, computed.days.map((day) => day.date));

    if (!leaveType.allowDuringProbation) {
      const employee = await tx.employee.findUnique({ where: { id: requesterId }, select: { officialStartDate: true } });
      const official = employee?.officialStartDate ? localDate(employee.officialStartDate.getTime(), "Asia/Ho_Chi_Minh") : null;
      if (official && computed.days[0].date < official) {
        throw new BadRequestException(`Đang trong thời gian thử việc (chính thức từ ${official}), chưa dùng được ${leaveType.name.toLocaleLowerCase("vi")}.`);
      }
    }
    if (leaveType.deductsBalance) await this.assertBalance(tx, requesterId, leaveType.id, leaveType.name, computed.days);

    const payload: LeavePayload = {
      leaveTypeCode: leaveType.code,
      leaveTypeName: leaveType.name,
      paid: leaveType.paid,
      deductsBalance: leaveType.deductsBalance,
      ranges: dto.ranges.map((range) => ({ fromDate: range.fromDate, toDate: range.toDate, fromTime: range.fromTime ?? null, toTime: range.toTime ?? null })),
      reason: dto.reason?.trim() || null,
      days: computed.days
    };
    return {
      payload,
      summary: {
        title: leaveType.name,
        subType: leaveType.code,
        fromDate: new Date(`${computed.days[0].date}T00:00:00.000Z`),
        toDate: new Date(`${computed.days.at(-1)!.date}T00:00:00.000Z`),
        quantity: computed.total,
        unit: "day"
      }
    };
  }

  conditionFields(): ConditionFieldDef[] {
    return [
      { key: "total_days", label: "Số ngày nghỉ", kind: "number" },
      { key: "leave_type", label: "Loại nghỉ (mã)", kind: "text" },
      { key: "paid", label: "Có hưởng lương", kind: "boolean" },
      { key: "deducts_balance", label: "Trừ quỹ phép", kind: "boolean" }
    ];
  }

  conditionRecord(request: Request) {
    const payload = leavePayloadOf(request);
    return {
      total_days: round2(payload.days.reduce((sum, day) => sum + day.units, 0)),
      leave_type: payload.leaveTypeCode,
      paid: payload.paid,
      deducts_balance: payload.deductsBalance
    };
  }

  affectedDates(request: Request) {
    return leavePayloadOf(request).days.map((day) => day.date);
  }

  // Reserve the days so two pending requests cannot overspend (§7.2).
  async onSubmitted(request: Request, context: HandlerContext) {
    const payload = leavePayloadOf(request);
    if (!payload.deductsBalance) return;
    const leaveType = await context.tx.leaveType.findUniqueOrThrow({ where: { code: payload.leaveTypeCode } });
    await this.assertBalance(context.tx, request.requesterId, leaveType.id, leaveType.name, payload.days);
    for (const [year, amount] of unitsByYear(payload.days)) {
      await this.balances.post(context.tx, { employeeId: request.requesterId, leaveTypeId: leaveType.id, year, field: "pending", amount, kind: "reserve", requestId: request.id, actorId: context.actorId, reason: request.code });
    }
  }

  async onWithdrawn(request: Request, context: HandlerContext) {
    await this.move(context, request, "pending", null, "release");
  }

  async onApproved(request: Request, context: HandlerContext) {
    await this.move(context, request, "pending", "used", "use");
  }

  async onCancelledAfterApproval(request: Request, context: HandlerContext) {
    await this.move(context, request, "used", null, "refund");
  }

  // Takes back what the request holds on `from`, adding it to `to` when given.
  private async move(context: HandlerContext, request: Request, from: "pending" | "used", to: "used" | null, kind: string) {
    for (const held of await this.balances.heldBy(context.tx, request.id, from)) {
      await this.balances.post(context.tx, { ...held, field: from, amount: -held.amount, kind: to ? "release" : kind, requestId: request.id, actorId: context.actorId, reason: request.code });
      if (to) await this.balances.post(context.tx, { ...held, field: to, amount: held.amount, kind, requestId: request.id, actorId: context.actorId, reason: request.code });
    }
  }

  private async assertBalance(tx: Tx, employeeId: string, leaveTypeId: string, name: string, days: LeaveDay[]) {
    for (const [year, amount] of unitsByYear(days)) {
      const available = await this.balances.available(tx, employeeId, leaveTypeId, year);
      if (amount > available) {
        throw new BadRequestException(`Không đủ ${name.toLocaleLowerCase("vi")} năm ${year}: còn ${available} ngày, đơn cần ${amount} ngày.`);
      }
    }
  }

  // LV-15: no two pending / approved leave requests may cover more than a full shift on one date.
  private async assertNoOverlap(tx: Tx, requesterId: string, days: LeaveDay[], from: string, to: string, requestId: string | undefined, shiftOn: Awaited<ReturnType<LeaveScheduleService["load"]>>) {
    const others = await tx.request.findMany({
      where: {
        type: "leave",
        requesterId,
        status: { in: ["pending", "approved"] },
        fromDate: { lte: new Date(`${to}T00:00:00.000Z`) },
        toDate: { gte: new Date(`${from}T00:00:00.000Z`) },
        ...(requestId ? { id: { not: requestId } } : {})
      },
      select: { code: true, payload: true }
    });
    for (const other of others) {
      const taken = new Map(leavePayloadOf(other).days.map((day) => [day.date, day.minutes]));
      for (const day of days) {
        const already = taken.get(day.date);
        if (already === undefined) continue;
        const shift = shiftOn(day.date);
        if (!shift || already + day.minutes > shift.requiredMinutes) {
          throw new BadRequestException(`Ngày ${day.date} đã có đơn nghỉ ${other.code}.`);
        }
      }
    }
  }

  private async assertPeriodsOpen(tx: Tx, dates: string[]) {
    const months = [...new Set(dates.map((date) => date.slice(0, 7)))];
    const locked = await tx.attendancePeriod.findMany({ where: { month: { in: months }, status: "locked" }, select: { month: true } });
    if (locked.length > 0) throw new BadRequestException(`Kỳ công ${locked.map((item) => item.month).join(", ")} đã chốt, không tạo đơn nghỉ cho những ngày này được.`);
  }
}
