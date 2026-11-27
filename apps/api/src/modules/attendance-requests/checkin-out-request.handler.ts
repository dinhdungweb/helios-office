import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common";
import type { Request } from "@prisma/client";
import { RequestTypeRegistry, type ConditionFieldDef, type HandlerContext, type RequestSummary, type RequestTypeHandler } from "../approvals/engine/request-types";
import { AttendanceRecalcService } from "../attendance/attendance-recalc.service";
import { zonedInstant } from "../attendance/engine/zoned-time";
import { CheckinOutPayloadDto } from "./attendance-requests.dto";
import { assertPeriodsOpen, dbDate, parseMinute, parsePayload, recalculateLater, resolveDay, revokeAdjustments, sameTypeRequests, timeZoneOf, todayIn } from "./request-day";

export type CheckinOutPayload = {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  // The check-out is on the next calendar day (night shift, or out after midnight).
  checkOutNextDay: boolean;
  shiftCode: string | null;
  // What the timesheet showed when the request was made, for the approver.
  recorded: { checkIn: string | null; checkOut: string | null; status: string | null };
  reason: string | null;
};

export function checkinOutPayloadOf(request: Pick<Request, "payload">): CheckinOutPayload {
  const payload = (request.payload ?? {}) as Partial<CheckinOutPayload>;
  return {
    date: payload.date ?? "",
    checkIn: payload.checkIn ?? null,
    checkOut: payload.checkOut ?? null,
    checkOutNextDay: payload.checkOutNextDay ?? false,
    shiftCode: payload.shiftCode ?? null,
    recorded: payload.recorded ?? { checkIn: null, checkOut: null, status: null },
    reason: payload.reason ?? null
  };
}

// LV-20: explanation of a missing or wrong check-in / check-out (docs/design/approval-engine.md §6).
// Approved, the times are an "explanation" adjustment the engine counts as punches of that work date.
@Injectable()
export class CheckinOutRequestHandler implements RequestTypeHandler<CheckinOutPayload>, OnModuleInit {
  readonly type = "checkin_out" as const;

  constructor(
    private readonly registry: RequestTypeRegistry,
    private readonly recalc: AttendanceRecalcService
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async prepare(raw: unknown, context: HandlerContext & { requestId?: string }): Promise<{ payload: CheckinOutPayload; summary: RequestSummary }> {
    const dto = await parsePayload(CheckinOutPayloadDto, raw, "Thông tin đơn giải trình chưa hợp lệ: cần ngày (YYYY-MM-DD), giờ vào và / hoặc giờ ra (HH:mm) và lý do.");
    const { tx, requesterId } = context;
    if (!dto.checkIn && !dto.checkOut) throw new BadRequestException("Hãy nhập giờ vào, giờ ra hoặc cả hai cần giải trình.");
    if (!dto.reason.trim()) throw new BadRequestException("Hãy nhập lý do giải trình.");

    const timeZone = await timeZoneOf(tx);
    if (dto.date > todayIn(timeZone)) throw new BadRequestException("Không giải trình chấm công cho ngày chưa tới.");
    const day = await resolveDay(tx, requesterId, dto.date);
    if (!day.employed) throw new BadRequestException(`Ngày ${dto.date} bạn chưa (hoặc không còn) làm việc tại công ty.`);

    const checkOutNextDay = nextDayCheckOut(dto.checkIn ?? null, dto.checkOut ?? null, day.shift);
    const [other] = await sameTypeRequests(tx, this.type, requesterId, dto.date, dto.date, context.requestId);
    if (other) throw new BadRequestException(`Ngày ${dto.date} đã có đơn giải trình ${other.code}. Sửa đơn đó thay vì tạo đơn mới.`);
    await assertPeriodsOpen(tx, [dto.date], "đơn giải trình");

    const stored = await tx.attendanceDay.findUnique({
      where: { employeeId_workDate: { employeeId: requesterId, workDate: dbDate(dto.date) } },
      select: { checkIn: true, checkOut: true, status: true }
    });
    const payload: CheckinOutPayload = {
      date: dto.date,
      checkIn: dto.checkIn ?? null,
      checkOut: dto.checkOut ?? null,
      checkOutNextDay,
      shiftCode: day.shift?.code ?? null,
      recorded: { checkIn: stored?.checkIn?.toISOString() ?? null, checkOut: stored?.checkOut?.toISOString() ?? null, status: stored?.status ?? null },
      reason: dto.reason.trim()
    };
    const what = dto.checkIn && dto.checkOut ? "giờ vào, giờ ra" : dto.checkIn ? "giờ vào" : "giờ ra";
    return {
      payload,
      summary: { title: `Giải trình ${what}`, subType: dto.checkIn && dto.checkOut ? "both" : dto.checkIn ? "check_in" : "check_out", fromDate: dbDate(dto.date), toDate: dbDate(dto.date), quantity: null, unit: null }
    };
  }

  conditionFields(): ConditionFieldDef[] {
    return [
      { key: "has_check_in", label: "Có giải trình giờ vào", kind: "boolean" },
      { key: "has_check_out", label: "Có giải trình giờ ra", kind: "boolean" }
    ];
  }

  conditionRecord(request: Request) {
    const payload = checkinOutPayloadOf(request);
    return { has_check_in: payload.checkIn !== null, has_check_out: payload.checkOut !== null };
  }

  affectedDates(request: Request) {
    return [checkinOutPayloadOf(request).date];
  }

  async onApproved(request: Request, context: HandlerContext) {
    const payload = checkinOutPayloadOf(request);
    const timeZone = await timeZoneOf(context.tx);
    await context.tx.attendanceAdjustment.create({
      data: {
        employeeId: request.requesterId,
        workDate: dbDate(payload.date),
        type: "explanation",
        punchesSet: false,
        checkIn: payload.checkIn ? new Date(zonedInstant(payload.date, parseMinute(payload.checkIn), timeZone)) : null,
        checkOut: payload.checkOut ? new Date(zonedInstant(payload.date, parseMinute(payload.checkOut) + (payload.checkOutNextDay ? 1440 : 0), timeZone)) : null,
        reason: `${request.code} · Giải trình chấm công`,
        sourceRequestId: request.id,
        createdById: context.actorId ?? null
      }
    });
    recalculateLater(this.recalc, request, context, [payload.date]);
  }

  async onCancelledAfterApproval(request: Request, context: HandlerContext) {
    await revokeAdjustments(request, context);
    recalculateLater(this.recalc, request, context, [checkinOutPayloadOf(request).date]);
  }
}

// A check-out not after the check-in, or on a night shift before the shift starts, is the next day.
export function nextDayCheckOut(checkIn: string | null, checkOut: string | null, shift: { startMinute: number; endMinute: number } | null) {
  if (!checkOut) return false;
  const out = parseMinute(checkOut);
  if (checkIn) return out <= parseMinute(checkIn);
  const overnight = shift !== null && shift.endMinute <= shift.startMinute;
  return overnight && out < shift!.startMinute;
}
