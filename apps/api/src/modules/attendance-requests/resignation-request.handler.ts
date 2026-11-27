import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common";
import type { Prisma, Request } from "@prisma/client";
import { RequestTypeRegistry, type ConditionFieldDef, type HandlerContext, type RequestSummary, type RequestTypeHandler } from "../approvals/engine/request-types";
import { localDate } from "../attendance/engine/zoned-time";
import { ResignationPayloadDto } from "./attendance-requests.dto";
import { dbDate, isoDate, parsePayload, sameTypeRequests, timeZoneOf, todayIn } from "./request-day";

export type ResignationPayload = {
  lastWorkingDate: string;
  // Calendar days between sending the request and the last working day.
  noticeDays: number;
  reason: string;
  handover: string | null;
  // Set on approval: the end date the profile had before, restored if HR cancels the request.
  previousEndDate?: string | null;
};

export function resignationPayloadOf(request: Pick<Request, "payload">): ResignationPayload {
  const payload = (request.payload ?? {}) as Partial<ResignationPayload>;
  return {
    lastWorkingDate: payload.lastWorkingDate ?? "",
    noticeDays: payload.noticeDays ?? 0,
    reason: payload.reason ?? "",
    handover: payload.handover ?? null,
    previousEndDate: payload.previousEndDate ?? null
  };
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

// LV-21: resignation (docs/design/approval-engine.md §6). Approved, the last working day becomes the
// end date on the profile, so attendance stops counting after it. The offboarding checklist is
// created here once RC-15 exists.
@Injectable()
export class ResignationRequestHandler implements RequestTypeHandler<ResignationPayload>, OnModuleInit {
  readonly type = "resignation" as const;

  constructor(private readonly registry: RequestTypeRegistry) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async prepare(raw: unknown, context: HandlerContext & { requestId?: string }): Promise<{ payload: ResignationPayload; summary: RequestSummary }> {
    const dto = await parsePayload(ResignationPayloadDto, raw, "Thông tin đơn thôi việc chưa hợp lệ: cần ngày làm việc cuối (YYYY-MM-DD) và lý do.");
    const { tx, requesterId } = context;
    if (!dto.reason.trim()) throw new BadRequestException("Hãy nhập lý do thôi việc.");

    const timeZone = await timeZoneOf(tx);
    const today = todayIn(timeZone);
    if (dto.lastWorkingDate < today) throw new BadRequestException("Ngày làm việc cuối không được trước hôm nay.");
    const employee = await tx.employee.findUnique({ where: { id: requesterId }, select: { startDate: true } });
    if (!employee) throw new BadRequestException("Không tìm thấy hồ sơ nhân sự.");
    if (dto.lastWorkingDate < localDate(employee.startDate.getTime(), timeZone)) throw new BadRequestException("Ngày làm việc cuối trước ngày vào làm.");

    const others = await sameTypeRequests(tx, this.type, requesterId, "2000-01-01", "2100-12-31", context.requestId);
    if (others.length > 0) throw new BadRequestException(`Bạn đã có đơn thôi việc ${others[0].code} đang chờ duyệt hoặc đã duyệt.`);

    const payload: ResignationPayload = {
      lastWorkingDate: dto.lastWorkingDate,
      noticeDays: daysBetween(today, dto.lastWorkingDate),
      reason: dto.reason.trim(),
      handover: dto.handover?.trim() || null
    };
    return {
      payload,
      summary: { title: "Xin thôi việc", subType: null, fromDate: dbDate(dto.lastWorkingDate), toDate: dbDate(dto.lastWorkingDate), quantity: null, unit: null }
    };
  }

  conditionFields(): ConditionFieldDef[] {
    return [{ key: "notice_days", label: "Số ngày báo trước", kind: "number" }];
  }

  conditionRecord(request: Request) {
    return { notice_days: resignationPayloadOf(request).noticeDays };
  }

  async onApproved(request: Request, context: HandlerContext) {
    const { tx } = context;
    const payload = resignationPayloadOf(request);
    const employee = await tx.employee.findUniqueOrThrow({ where: { id: request.requesterId }, select: { endDate: true } });
    const previousEndDate = employee.endDate ? isoDate(employee.endDate) : null;
    await tx.request.update({ where: { id: request.id }, data: { payload: { ...payload, previousEndDate } as Prisma.InputJsonValue } });
    await tx.employee.update({ where: { id: request.requesterId }, data: { endDate: dbDate(payload.lastWorkingDate) } });
  }

  // Restores the end date, unless HR changed it since the approval.
  async onCancelledAfterApproval(request: Request, context: HandlerContext) {
    const { tx } = context;
    const payload = resignationPayloadOf(request);
    const employee = await tx.employee.findUnique({ where: { id: request.requesterId }, select: { endDate: true } });
    if (employee?.endDate && isoDate(employee.endDate) === payload.lastWorkingDate) {
      await tx.employee.update({ where: { id: request.requesterId }, data: { endDate: payload.previousEndDate ? dbDate(payload.previousEndDate) : null } });
    }
  }
}
