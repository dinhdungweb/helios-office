import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

// LV-01: kept as a filter over requests of type "leave" so existing callers do not break
// (docs/design/approval-engine.md §9), in the shape the old LeaveRequest table had: three dashboards
// read employee / totalDays / type. Dropped in Phase 9.
@Injectable()
export class LeaveRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const requests = await this.prisma.request.findMany({
      where: { type: "leave", status: { not: "draft" } },
      include: {
        requester: {
          select: {
            id: true,
            code: true,
            fullName: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return requests.map((request) => ({
      id: request.id,
      code: request.code,
      employeeId: request.requesterId,
      type: request.title,
      subType: request.subType,
      fromDate: request.fromDate,
      toDate: request.toDate,
      totalDays: request.quantity === null ? null : Number(request.quantity),
      reason: typeof request.payload === "object" && request.payload && "reason" in request.payload ? String((request.payload as { reason?: unknown }).reason ?? "") || null : null,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      employee: request.requester
    }));
  }
}
