import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { auditContextStorage } from "./audit-context";

export type HttpAuditEntry = {
  method: string;
  route: string;
  entityType: string;
  entityId: string;
  params: Record<string, string>;
  bodyFields: string[];
  statusCode: number;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Spread into the `data` of an auditLog.create call:
  //   tx.auditLog.create({ data: { ...this.audit.contextFields(), actorId, action, ... } })
  // Adds who/where/which request, and tells AuditInterceptor the request already has a domain entry.
  contextFields() {
    const context = auditContextStorage.getStore();

    if (!context) {
      return {};
    }

    context.recorded = true;

    return {
      actorAccountId: context.actorAccountId ?? undefined,
      ipAddress: context.ipAddress ?? undefined,
      userAgent: context.userAgent ?? undefined,
      requestId: context.requestId
    };
  }

  // Safety-net entry for a successful mutation that wrote no domain audit entry. Stores route,
  // params and the names of submitted fields only — never body values, which may hold secrets.
  async recordHttp(entry: HttpAuditEntry) {
    const context = auditContextStorage.getStore();

    try {
      await this.prisma.auditLog.create({
        data: {
          ...this.contextFields(),
          actorId: context?.actorEmployeeId ?? undefined,
          source: "http",
          action: `http.${entry.method.toLowerCase()}`,
          entityType: entry.entityType,
          entityId: entry.entityId,
          afterValue: {
            route: entry.route,
            params: entry.params,
            bodyFields: entry.bodyFields,
            statusCode: entry.statusCode
          }
        }
      });
    } catch (error) {
      // Auditing must not turn a completed write into a failed response.
      this.logger.error(`Could not write HTTP audit entry for ${entry.method} ${entry.route}`, error as Error);
    }
  }
}
