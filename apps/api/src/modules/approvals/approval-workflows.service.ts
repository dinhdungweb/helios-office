import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateApprovalWorkflowDto } from "./approval-workflows.dto";

@Injectable()
export class ApprovalWorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeArchived = false) {
    return this.prisma.approvalWorkflowDefinition.findMany({
      where: includeArchived ? undefined : { status: { not: "archived" } },
      include: {
        follower: { select: { id: true, fullName: true, avatarUrl: true } },
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        updatedBy: { select: { id: true, fullName: true, avatarUrl: true } }
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  async create(dto: CreateApprovalWorkflowDto, actorId?: string) {
    try {
      return await this.prisma.approvalWorkflowDefinition.create({
        data: {
          code: dto.code?.trim() || null,
          name: dto.name.trim(),
          status: dto.status,
          objectType: dto.objectType,
          subObject: dto.subObject || "all",
          versionMode: dto.versionMode ?? true,
          approvalType: dto.approvalType || "workflow",
          followerId: dto.followerId || null,
          showFlowInObject: dto.showFlowInObject ?? false,
          allowAttachmentsAfterApproved: dto.allowAttachmentsAfterApproved ?? false,
          allowDocumentChangesAfterApproved: dto.allowDocumentChangesAfterApproved ?? false,
          allowDiscussionAfterApproved: dto.allowDiscussionAfterApproved ?? true,
          overdueAction: dto.overdueAction || "none",
          flowDefinition: dto.flowDefinition as Prisma.InputJsonValue,
          createdById: actorId ?? null,
          updatedById: actorId ?? null
        },
        include: {
          follower: { select: { id: true, fullName: true, avatarUrl: true } },
          createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
          updatedBy: { select: { id: true, fullName: true, avatarUrl: true } }
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException("Workflow code already exists");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new BadRequestException("Follower is not available");
      }
      throw error;
    }
  }

  async delete(id: string) {
    const workflow = await this.prisma.approvalWorkflowDefinition.findUnique({ where: { id } });
    if (!workflow) throw new NotFoundException(`Approval workflow ${id} was not found`);
    await this.prisma.approvalWorkflowDefinition.delete({ where: { id } });
    return { id, deleted: true };
  }
}
