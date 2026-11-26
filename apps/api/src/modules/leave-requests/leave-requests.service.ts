import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

// LV-01: kept as a filter over requests of type "leave" so existing callers do not break
// (docs/design/approval-engine.md §9); dropped in Phase 9.
@Injectable()
export class LeaveRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.request.findMany({
      where: { type: "leave" },
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
  }
}
