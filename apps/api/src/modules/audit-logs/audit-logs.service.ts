import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { pageArgs, paginated, sortArgs } from "../../common/pagination/list-query";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuditLogQueryDto } from "./audit-logs.dto";

const auditLogInclude = {
  actorAccount: { select: { id: true, displayName: true, email: true } },
  employee: { select: { id: true, code: true, fullName: true } }
} satisfies Prisma.AuditLogInclude;

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AuditLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      entityType: query.entityType,
      entityId: query.entityId,
      actorAccountId: query.actorAccountId,
      source: query.source,
      action: query.action ? { startsWith: query.action } : undefined,
      createdAt: query.from || query.to ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined } : undefined,
      OR: query.q
        ? [
            { action: { contains: query.q, mode: "insensitive" } },
            { entityId: { contains: query.q, mode: "insensitive" } },
            { actorAccount: { displayName: { contains: query.q, mode: "insensitive" } } }
          ]
        : undefined
    };
    const { skip, take } = pageArgs(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: auditLogInclude,
        orderBy: sortArgs(query, ["createdAt", "action", "entityType"] as const, "createdAt"),
        skip,
        take
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return paginated(items, total, query);
  }

  async findOne(id: string) {
    const entry = await this.prisma.auditLog.findUnique({ where: { id }, include: auditLogInclude });

    if (!entry) {
      throw new NotFoundException(`Audit log ${id} was not found`);
    }

    return entry;
  }
}
