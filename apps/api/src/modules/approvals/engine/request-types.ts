import { Injectable } from "@nestjs/common";
import type { Prisma, Request } from "@prisma/client";

// What each request type adds to the engine (docs/design/approval-engine.md §6). A type's module
// registers its handler on init; the engine and the requests API look handlers up by type.

export const REQUEST_TYPES = ["leave", "absence", "overtime", "checkin_out", "shift_change", "resignation", "business_trip", "proposal"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

// Prefix of the request code, e.g. NP-2026-000123.
export const REQUEST_CODE_PREFIX: Record<RequestType, string> = {
  leave: "NP",
  absence: "VM",
  overtime: "LT",
  checkin_out: "GT",
  shift_change: "DC",
  resignation: "TV",
  business_trip: "CT",
  proposal: "DX"
};

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  leave: "Đơn xin nghỉ",
  absence: "Đơn vắng mặt",
  overtime: "Đơn làm thêm",
  checkin_out: "Đơn giải trình chấm công",
  shift_change: "Đơn đổi ca",
  resignation: "Đơn xin thôi việc",
  business_trip: "Đơn công tác",
  proposal: "Đề xuất"
};

export function isRequestType(value: unknown): value is RequestType {
  return typeof value === "string" && (REQUEST_TYPES as readonly string[]).includes(value);
}

export type ConditionFieldDef = { key: string; label: string; kind: "number" | "text" | "date" | "boolean" };

// Summary columns stored on Request for lists, calendars and conditions.
export type RequestSummary = {
  title: string;
  subType?: string | null;
  fromDate?: Date | null;
  toDate?: Date | null;
  quantity?: number | null;
  unit?: "day" | "hour" | null;
};

export type HandlerContext = { tx: Prisma.TransactionClient; requesterId: string; actorId?: string };

export interface RequestTypeHandler<P = Record<string, unknown>> {
  type: RequestType;
  // Validates and normalises the payload (throws BadRequestException with a reason the user can act on).
  prepare(payload: unknown, context: HandlerContext & { requestId?: string }): Promise<{ payload: P; summary: RequestSummary }>;
  conditionFields(): ConditionFieldDef[];
  conditionRecord(request: Request): Record<string, unknown>;
  // Submitted (also resubmitted): e.g. reserve leave days.
  onSubmitted?(request: Request, context: HandlerContext): Promise<void>;
  // Rejected, returned, recalled or cancelled before approval: release what onSubmitted took.
  onWithdrawn?(request: Request, context: HandlerContext): Promise<void>;
  // Runs in the same transaction as the final approval.
  onApproved?(request: Request, context: HandlerContext): Promise<void>;
  // HR cancels an approved request.
  onCancelledAfterApproval?(request: Request, context: HandlerContext): Promise<void>;
  // Work dates the request touches, checked against locked attendance periods.
  affectedDates?(request: Request): string[];
}

@Injectable()
export class RequestTypeRegistry {
  private readonly handlers = new Map<string, RequestTypeHandler>();

  register(handler: RequestTypeHandler<never>) {
    this.handlers.set(handler.type, handler as unknown as RequestTypeHandler);
  }

  get(type: string): RequestTypeHandler | undefined {
    return this.handlers.get(type);
  }

  require(type: string): RequestTypeHandler {
    const handler = this.handlers.get(type);
    if (!handler) throw new Error(`No handler registered for request type ${type}`);
    return handler;
  }

  types() {
    return [...this.handlers.keys()];
  }
}
