import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common";
import type { Request } from "@prisma/client";
import { RequestTypeRegistry, type ConditionFieldDef, type HandlerContext, type RequestSummary, type RequestTypeHandler } from "../approvals/engine/request-types";
import { AttendanceRecalcService } from "../attendance/attendance-recalc.service";
import { zonedInstant } from "../attendance/engine/zoned-time";
import { OvertimePayloadDto } from "./attendance-requests.dto";
import {
  assertPeriodsOpen,
  dbDate,
  formatMinutes,
  overlaps,
  parseMinute,
  parsePayload,
  recalculateLater,
  resolveDay,
  revokeAdjustments,
  sameTypeRequests,
  timeZoneOf
} from "./request-day";

export type OvertimeKind = "weekday" | "day_off" | "holiday";
export const OVERTIME_KIND_LABEL: Record<OvertimeKind, string> = { weekday: "Ngày thường", day_off: "Ngày nghỉ", holiday: "Ngày lễ" };

export type OvertimePayload = {
  date: string;
  fromTime: string;
  toTime: string;
  // The end is on the next day.
  overnight: boolean;
  minutes: number;
  kind: OvertimeKind;
  kindLabel: string;
  shiftCode: string | null;
  reason: string | null;
};

export function overtimePayloadOf(request: Pick<Request, "payload">): OvertimePayload {
  const payload = (request.payload ?? {}) as Partial<OvertimePayload>;
  const kind = payload.kind ?? "weekday";
  return {
    date: payload.date ?? "",
    fromTime: payload.fromTime ?? "00:00",
    toTime: payload.toTime ?? "00:00",
    overnight: payload.overnight ?? false,
    minutes: payload.minutes ?? 0,
    kind,
    kindLabel: OVERTIME_KIND_LABEL[kind],
    shiftCode: payload.shiftCode ?? null,
    reason: payload.reason ?? null
  };
}

const MAX_MINUTES = 16 * 60;

// Minutes from the start of the OT date (the end may pass 24:00).
function spanOf(payload: Pick<OvertimePayload, "fromTime" | "toTime">) {
  const start = parseMinute(payload.fromTime);
  let end = parseMinute(payload.toTime);
  if (end <= start) end += 1440;
  return { start, end };
}

// LV-18: overtime (docs/design/approval-engine.md §6). The kind (weekday / day off / holiday) comes
// from the schedule and holiday list, not from the requester. Approved, the window is an "overtime"
// adjustment and the day's overtimeMinutes shows the approved time.
@Injectable()
export class OvertimeRequestHandler implements RequestTypeHandler<OvertimePayload>, OnModuleInit {
  readonly type = "overtime" as const;

  constructor(
    private readonly registry: RequestTypeRegistry,
    private readonly recalc: AttendanceRecalcService
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async prepare(raw: unknown, context: HandlerContext & { requestId?: string }): Promise<{ payload: OvertimePayload; summary: RequestSummary }> {
    const dto = await parsePayload(OvertimePayloadDto, raw, "Thông tin đơn làm thêm chưa hợp lệ: cần ngày (YYYY-MM-DD), giờ bắt đầu và kết thúc (HH:mm).");
    const { tx, requesterId } = context;
    const span = spanOf(dto);
    const minutes = span.end - span.start;
    if (minutes < 15) throw new BadRequestException("Thời gian làm thêm tối thiểu 15 phút.");
    if (minutes > MAX_MINUTES) throw new BadRequestException("Thời gian làm thêm tối đa 16 giờ mỗi đơn.");

    const day = await resolveDay(tx, requesterId, dto.date);
    if (!day.employed) throw new BadRequestException(`Ngày ${dto.date} bạn chưa (hoặc không còn) làm việc tại công ty.`);
    const holiday = day.holiday && day.holiday.type !== "compensatory_workday";
    const kind: OvertimeKind = holiday ? "holiday" : day.shift ? "weekday" : "day_off";

    // Overtime is time outside the shift; inside it is ordinary work.
    if (day.shift) {
      const shift = day.shift.endMinute <= day.shift.startMinute ? { start: day.shift.startMinute, end: day.shift.endMinute + 1440 } : { start: day.shift.startMinute, end: day.shift.endMinute };
      if (overlaps(span, shift)) {
        throw new BadRequestException(`Giờ làm thêm trùng với ca ${day.shift.code} (${minuteLabel(shift.start)} – ${minuteLabel(shift.end)}). Hãy chọn giờ ngoài ca.`);
      }
    }
    for (const other of await sameTypeRequests(tx, this.type, requesterId, dto.date, dto.date, context.requestId)) {
      const taken = overtimePayloadOf(other);
      if (taken.date === dto.date && overlaps(span, spanOf(taken))) {
        throw new BadRequestException(`Ngày ${dto.date} từ ${taken.fromTime} đến ${taken.toTime} đã có đơn làm thêm ${other.code}.`);
      }
    }
    await assertPeriodsOpen(tx, [dto.date], "đơn làm thêm");

    const payload: OvertimePayload = {
      date: dto.date,
      fromTime: dto.fromTime,
      toTime: dto.toTime,
      overnight: span.end > 1440,
      minutes,
      kind,
      kindLabel: OVERTIME_KIND_LABEL[kind],
      shiftCode: day.shift?.code ?? null,
      reason: dto.reason?.trim() || null
    };
    return {
      payload,
      summary: {
        title: `Làm thêm ${OVERTIME_KIND_LABEL[kind].toLocaleLowerCase("vi")} (${formatMinutes(minutes)})`,
        subType: kind,
        fromDate: dbDate(dto.date),
        toDate: dbDate(dto.date),
        quantity: Math.round((minutes / 60) * 100) / 100,
        unit: "hour"
      }
    };
  }

  conditionFields(): ConditionFieldDef[] {
    return [
      { key: "hours", label: "Số giờ làm thêm", kind: "number" },
      { key: "overtime_kind", label: "Loại làm thêm (weekday / day_off / holiday)", kind: "text" }
    ];
  }

  conditionRecord(request: Request) {
    const payload = overtimePayloadOf(request);
    return { hours: Math.round((payload.minutes / 60) * 100) / 100, overtime_kind: payload.kind };
  }

  affectedDates(request: Request) {
    return [overtimePayloadOf(request).date];
  }

  async onApproved(request: Request, context: HandlerContext) {
    const payload = overtimePayloadOf(request);
    const timeZone = await timeZoneOf(context.tx);
    const span = spanOf(payload);
    await context.tx.attendanceAdjustment.create({
      data: {
        employeeId: request.requesterId,
        workDate: dbDate(payload.date),
        type: "overtime",
        punchesSet: false,
        checkIn: new Date(zonedInstant(payload.date, span.start, timeZone)),
        checkOut: new Date(zonedInstant(payload.date, span.end, timeZone)),
        reason: `${request.code} · Làm thêm ${payload.kindLabel.toLocaleLowerCase("vi")}`,
        sourceRequestId: request.id,
        createdById: context.actorId ?? null
      }
    });
    recalculateLater(this.recalc, request, context, [payload.date]);
  }

  async onCancelledAfterApproval(request: Request, context: HandlerContext) {
    await revokeAdjustments(request, context);
    recalculateLater(this.recalc, request, context, [overtimePayloadOf(request).date]);
  }
}

function minuteLabel(minute: number) {
  const value = minute % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
