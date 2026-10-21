import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import { Observable, from, mergeMap } from "rxjs";
import type { RequestWithUser } from "../../modules/auth/auth.types";
import { auditContextStorage, type AuditContext } from "./audit-context";
import { AuditService } from "./audit.service";
import { SKIP_AUDIT_KEY } from "./skip-audit.decorator";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type HttpRequest = RequestWithUser & {
  method: string;
  ip?: string;
  ips?: string[];
  params?: Record<string, string>;
  body?: unknown;
  route?: { path?: string };
  headers: RequestWithUser["headers"] & { "user-agent"?: string; "x-request-id"?: string };
};

// 1. Runs every HTTP request inside an AuditContext so services' audit entries carry the actor,
//    IP, user agent and request id (see AuditService.contextFields).
// 2. After a successful mutation that wrote no domain entry, records an HTTP-level entry so every
//    write leaves a trace (docs/architecture.md: "Every mutation ... must write an audit log").
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<HttpRequest>();
    const response = context.switchToHttp().getResponse<{ statusCode: number; setHeader?: (name: string, value: string) => void }>();
    const store: AuditContext = {
      requestId: typeof request.headers["x-request-id"] === "string" ? request.headers["x-request-id"] : randomUUID(),
      actorAccountId: request.user?.account?.id ?? null,
      actorEmployeeId: request.user?.account?.employeeId ?? null,
      ipAddress: request.ips?.[0] ?? request.ip ?? null,
      userAgent: request.headers["user-agent"]?.slice(0, 300) ?? null,
      recorded: false
    };
    response.setHeader?.("X-Request-Id", store.requestId);

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [context.getHandler(), context.getClass()]);
    const needsSafetyNet = MUTATING_METHODS.has(request.method) && !skip;
    const controller = context.getClass().name.replace(/Controller$/, "");

    return new Observable((subscriber) =>
      auditContextStorage.run(store, () =>
        next
          .handle()
          .pipe(
            mergeMap((value) => {
              if (!needsSafetyNet || store.recorded) {
                return [value];
              }

              const params = request.params ?? {};
              return from(
                this.audit.recordHttp({
                  method: request.method,
                  route: request.route?.path ?? "",
                  entityType: controller,
                  entityId: params.id ?? params.key ?? params.scope ?? "-",
                  params,
                  bodyFields: bodyFieldNames(request.body),
                  statusCode: response.statusCode
                })
              ).pipe(mergeMap(() => [value]));
            })
          )
          .subscribe(subscriber)
      )
    );
  }
}

function bodyFieldNames(body: unknown) {
  return body && typeof body === "object" && !Array.isArray(body) ? Object.keys(body).sort() : [];
}
