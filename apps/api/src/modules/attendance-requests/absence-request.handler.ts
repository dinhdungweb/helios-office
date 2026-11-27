import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common";
import type { Request } from "@prisma/client";
import { RequestTypeRegistry, type ConditionFieldDef, type HandlerContext, type RequestSummary, type RequestTypeHandler } from "../approvals/engine/request-types";
import { AttendanceRecalcService } from "../attendance/attendance-recalc.service";
import { zonedInstant } from "../attendance/engine/zoned-time";
import { AbsencePayloadDto } from "./attendance-requests.dto";
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

export type AbsenceKind = "company" | "personal";
export const ABSENCE_KIND_LABEL: Record<AbsenceKind, string> = { company: "Việc công ty", personal: "Việc riêng" };

export type AbsenceRange = { date: string; fromTime: string; toTime: string; minutes: number };
export type AbsencePayload = { kind: AbsenceKind; kindLabel: string; ranges: AbsenceRange[]; reason: string | null };

export function absencePayloadOf(request: Pick<Request, "payload">): AbsencePayload {
  const payload = (request.payload ?? {}) as Partial<AbsencePayload>;
  const kind = payload.kind === "company" ? "company" : "personal";
  return { kind, kindLabel: ABSENCE_KIND_LABEL[kind], ranges: payload.ranges ?? [], reason: payload.reason ?? null };
}

const windowOf = (range: Pick<AbsenceRange, "fromTime" | "toTime">) => ({ start: parseMinute(range.fromTime), end: parseMinute(range.toTime) });

// LV-17: time out during working hours (docs/design/approval-engine.md §6). Approved, each window is
// an "absence" adjustment: on company business it counts as worked, personal time out comes off the
// hours worked; lateness / leaving early inside the window is forgiven either way.
@Injectable()
export class AbsenceRequestHandler implements RequestTypeHandler<AbsencePayload>, OnModuleInit {
  readonly type = "absence" as const;

  constructor(
    private readonly registry: RequestTypeRegistry,
    private readonly recalc: AttendanceRecalcService
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async prepare(raw: unknown, context: HandlerContext & { requestId?: string }): Promise<{ payload: AbsencePayload; summary: RequestSummary }> {
    const dto = await parsePayload(AbsencePayloadDto, raw, "Thông tin đơn vắng mặt chưa hợp lệ: cần loại vắng mặt và ít nhất một khoảng (ngày YYYY-MM-DD, giờ HH:mm).");
    const { tx, requesterId } = context;

    const ranges = dto.ranges
      .map((range) => {
        const window = windowOf(range);
        if (window.end <= window.start) throw new BadRequestException(`Ngày ${range.date}: giờ kết thúc phải sau giờ bắt đầu (${range.fromTime} – ${range.toTime}).`);
        return { date: range.date, fromTime: range.fromTime, toTime: range.toTime, minutes: window.end - window.start };
      })
      .sort((a, b) => (a.date === b.date ? a.fromTime.localeCompare(b.fromTime) : a.date.localeCompare(b.date)));

    for (let index = 1; index < ranges.length; index += 1) {
      const [previous, current] = [ranges[index - 1], ranges[index]];
      if (previous.date === current.date && overlaps(windowOf(previous), windowOf(current))) {
        throw new BadRequestException(`Ngày ${current.date}: các khoảng vắng mặt trong đơn bị trùng giờ.`);
      }
    }
    for (const date of [...new Set(ranges.map((range) => range.date))]) {
      const day = await resolveDay(tx, requesterId, date);
      if (!day.shift) throw new BadRequestException(`Ngày ${date} không có ca làm việc, không cần đơn vắng mặt.`);
    }

    const from = ranges[0].date;
    const to = ranges.at(-1)!.date;
    for (const other of await sameTypeRequests(tx, this.type, requesterId, from, to, context.requestId)) {
      for (const taken of absencePayloadOf(other).ranges) {
        const clash = ranges.find((range) => range.date === taken.date && overlaps(windowOf(range), windowOf(taken)));
        if (clash) throw new BadRequestException(`Ngày ${clash.date} từ ${taken.fromTime} đến ${taken.toTime} đã có đơn vắng mặt ${other.code}.`);
      }
    }
    await assertPeriodsOpen(tx, ranges.map((range) => range.date), "đơn vắng mặt");

    const minutes = ranges.reduce((sum, range) => sum + range.minutes, 0);
    const payload: AbsencePayload = { kind: dto.kind, kindLabel: ABSENCE_KIND_LABEL[dto.kind], ranges, reason: dto.reason?.trim() || null };
    return {
      payload,
      summary: {
        title: `Vắng mặt · ${ABSENCE_KIND_LABEL[dto.kind].toLocaleLowerCase("vi")} (${formatMinutes(minutes)})`,
        subType: dto.kind,
        fromDate: dbDate(from),
        toDate: dbDate(to),
        quantity: Math.round((minutes / 60) * 100) / 100,
        unit: "hour"
      }
    };
  }

  conditionFields(): ConditionFieldDef[] {
    return [
      { key: "hours", label: "Số giờ vắng mặt", kind: "number" },
      { key: "absence_kind", label: "Loại vắng mặt (company / personal)", kind: "text" }
    ];
  }

  conditionRecord(request: Request) {
    const payload = absencePayloadOf(request);
    return { hours: Math.round((payload.ranges.reduce((sum, range) => sum + range.minutes, 0) / 60) * 100) / 100, absence_kind: payload.kind };
  }

  affectedDates(request: Request) {
    return [...new Set(absencePayloadOf(request).ranges.map((range) => range.date))];
  }

  async onApproved(request: Request, context: HandlerContext) {
    const payload = absencePayloadOf(request);
    const timeZone = await timeZoneOf(context.tx);
    await context.tx.attendanceAdjustment.createMany({
      data: payload.ranges.map((range) => ({
        employeeId: request.requesterId,
        workDate: dbDate(range.date),
        type: "absence" as const,
        paid: payload.kind === "company",
        punchesSet: false,
        checkIn: new Date(zonedInstant(range.date, parseMinute(range.fromTime), timeZone)),
        checkOut: new Date(zonedInstant(range.date, parseMinute(range.toTime), timeZone)),
        reason: `${request.code} · Vắng mặt ${payload.kindLabel.toLocaleLowerCase("vi")}`,
        sourceRequestId: request.id,
        createdById: context.actorId ?? null
      }))
    });
    recalculateLater(this.recalc, request, context, this.affectedDates(request));
  }

  async onCancelledAfterApproval(request: Request, context: HandlerContext) {
    await revokeAdjustments(request, context);
    recalculateLater(this.recalc, request, context, this.affectedDates(request));
  }
}
