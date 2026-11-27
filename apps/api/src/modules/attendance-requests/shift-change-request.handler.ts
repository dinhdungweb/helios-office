import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common";
import type { Prisma, Request } from "@prisma/client";
import { RequestTypeRegistry, type ConditionFieldDef, type HandlerContext, type RequestSummary, type RequestTypeHandler } from "../approvals/engine/request-types";
import { AttendanceRecalcService } from "../attendance/attendance-recalc.service";
import { ShiftChangePayloadDto } from "./attendance-requests.dto";
import { assertPeriodsOpen, dbDate, parsePayload, recalculateLater, resolveDay, revokeAdjustments, sameTypeRequests } from "./request-day";

type ShiftRef = { id: string; code: string; name: string };

export type ShiftChangePayload = { date: string; fromShift: ShiftRef | null; toShift: ShiftRef; reason: string | null };

export function shiftChangePayloadOf(request: Pick<Request, "payload">): ShiftChangePayload {
  const payload = (request.payload ?? {}) as Partial<ShiftChangePayload>;
  return { date: payload.date ?? "", fromShift: payload.fromShift ?? null, toShift: payload.toShift ?? { id: "", code: "", name: "" }, reason: payload.reason ?? null };
}

// What the schedule held on the date before the approved change, kept to put it back on cancel.
type Before = { assignment: { shiftId: string | null; note: string | null } | null };

// LV-19: work another shift on a date (docs/design/approval-engine.md §6). Approved, the person's
// shift assignment for that date becomes the new shift; a "shift_swap" adjustment keeps what was
// there before. Swapping with a colleague is not part of this request type.
@Injectable()
export class ShiftChangeRequestHandler implements RequestTypeHandler<ShiftChangePayload>, OnModuleInit {
  readonly type = "shift_change" as const;

  constructor(
    private readonly registry: RequestTypeRegistry,
    private readonly recalc: AttendanceRecalcService
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async prepare(raw: unknown, context: HandlerContext & { requestId?: string }): Promise<{ payload: ShiftChangePayload; summary: RequestSummary }> {
    const dto = await parsePayload(ShiftChangePayloadDto, raw, "Thông tin đơn đổi ca chưa hợp lệ: cần ngày (YYYY-MM-DD) và ca muốn đổi sang.");
    const { tx, requesterId } = context;

    const target = await tx.shift.findUnique({ where: { id: dto.toShiftId }, select: { id: true, code: true, name: true, status: true } });
    if (!target || target.status !== "active") throw new BadRequestException("Ca muốn đổi sang không tồn tại hoặc đã ngừng sử dụng.");
    const day = await resolveDay(tx, requesterId, dto.date);
    if (!day.employed) throw new BadRequestException(`Ngày ${dto.date} bạn chưa (hoặc không còn) làm việc tại công ty.`);
    if (day.shift?.id === target.id) throw new BadRequestException(`Ngày ${dto.date} bạn đã làm ca ${target.code}.`);

    const [other] = await sameTypeRequests(tx, this.type, requesterId, dto.date, dto.date, context.requestId);
    if (other) throw new BadRequestException(`Ngày ${dto.date} đã có đơn đổi ca ${other.code}.`);
    await assertPeriodsOpen(tx, [dto.date], "đơn đổi ca");

    const fromShift = day.shift ? { id: day.shift.id, code: day.shift.code, name: day.shift.name } : null;
    const toShift = { id: target.id, code: target.code, name: target.name };
    return {
      payload: { date: dto.date, fromShift, toShift, reason: dto.reason?.trim() || null },
      summary: { title: `Đổi ca ${fromShift?.code ?? "nghỉ"} → ${toShift.code}`, subType: toShift.code, fromDate: dbDate(dto.date), toDate: dbDate(dto.date), quantity: null, unit: null }
    };
  }

  conditionFields(): ConditionFieldDef[] {
    return [
      { key: "to_shift", label: "Ca đổi sang (mã)", kind: "text" },
      { key: "from_shift", label: "Ca hiện tại (mã)", kind: "text" }
    ];
  }

  conditionRecord(request: Request) {
    const payload = shiftChangePayloadOf(request);
    return { to_shift: payload.toShift.code, from_shift: payload.fromShift?.code ?? null };
  }

  affectedDates(request: Request) {
    return [shiftChangePayloadOf(request).date];
  }

  async onApproved(request: Request, context: HandlerContext) {
    const { tx } = context;
    const payload = shiftChangePayloadOf(request);
    const target = await tx.shift.findUnique({ where: { id: payload.toShift.id }, select: { status: true } });
    if (!target || target.status !== "active") throw new BadRequestException(`Ca ${payload.toShift.code} đã ngừng sử dụng, không duyệt đơn đổi ca được.`);

    const key = { employeeId_date: { employeeId: request.requesterId, date: dbDate(payload.date) } };
    const existing = await tx.shiftAssignment.findUnique({ where: key, select: { shiftId: true, note: true } });
    const before: Before = { assignment: existing };
    const note = `Đổi ca theo đơn ${request.code}`;
    await tx.shiftAssignment.upsert({
      where: key,
      create: { employeeId: request.requesterId, date: dbDate(payload.date), shiftId: payload.toShift.id, note, createdById: context.actorId ?? null },
      update: { shiftId: payload.toShift.id, note }
    });
    await tx.attendanceAdjustment.create({
      data: {
        employeeId: request.requesterId,
        workDate: dbDate(payload.date),
        type: "shift_swap",
        punchesSet: false,
        before: before as Prisma.InputJsonValue,
        reason: `${request.code} · Đổi ca ${payload.fromShift?.code ?? "nghỉ"} → ${payload.toShift.code}`,
        sourceRequestId: request.id,
        createdById: context.actorId ?? null
      }
    });
    recalculateLater(this.recalc, request, context, [payload.date]);
  }

  // Puts the schedule back, unless someone changed that date again since the approval.
  async onCancelledAfterApproval(request: Request, context: HandlerContext) {
    const { tx } = context;
    const payload = shiftChangePayloadOf(request);
    const record = await tx.attendanceAdjustment.findFirst({ where: { sourceRequestId: request.id, type: "shift_swap", revokedAt: null }, select: { before: true } });
    const key = { employeeId_date: { employeeId: request.requesterId, date: dbDate(payload.date) } };
    const current = await tx.shiftAssignment.findUnique({ where: key, select: { shiftId: true } });
    if (record && current?.shiftId === payload.toShift.id) {
      const previous = (record.before as Before | null)?.assignment ?? null;
      if (previous) await tx.shiftAssignment.update({ where: key, data: { shiftId: previous.shiftId, note: previous.note } });
      else await tx.shiftAssignment.delete({ where: key });
    }
    await revokeAdjustments(request, context);
    recalculateLater(this.recalc, request, context, [payload.date]);
  }
}
