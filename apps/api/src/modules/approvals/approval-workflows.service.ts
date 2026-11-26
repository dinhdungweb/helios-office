import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type ApprovalWorkflowDefinition } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { CreateApprovalWorkflowDto, UpdateApprovalWorkflowDto } from "./approval-workflows.dto";
import { parseFlow, sanitizeFlow, validateFlow } from "./engine/flow";

const PEOPLE = {
  follower: { select: { id: true, fullName: true, avatarUrl: true } },
  createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
  updatedBy: { select: { id: true, fullName: true, avatarUrl: true } }
} as const;

// Fields copied into every frozen version besides the diagram.
const SETTING_FIELDS = [
  "overdueAction",
  "followerId",
  "approvalType",
  "allowAttachmentsAfterApproved",
  "allowDocumentChangesAfterApproved",
  "allowDiscussionAfterApproved"
] as const;

// Changing any of these makes a new version (AP-06): requests already running keep theirs.
const VERSIONED_FIELDS = new Set<string>(["flowDefinition", ...SETTING_FIELDS]);

function settingsOf(workflow: Pick<ApprovalWorkflowDefinition, (typeof SETTING_FIELDS)[number]>) {
  return Object.fromEntries(SETTING_FIELDS.map((field) => [field, workflow[field]])) as Prisma.InputJsonObject;
}

function json(value: unknown) {
  return value === null || value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}

// Approval workflow definitions (AP-01 → AP-08, AP-25). The engine runs ApprovalWorkflowVersion
// rows, never the definition itself (docs/design/approval-engine.md §5).
@Injectable()
export class ApprovalWorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  findAll(includeArchived = false) {
    return this.prisma.approvalWorkflowDefinition.findMany({
      where: includeArchived ? undefined : { status: { not: "archived" } },
      include: PEOPLE,
      orderBy: { updatedAt: "desc" }
    });
  }

  async findOne(id: string) {
    const workflow = await this.prisma.approvalWorkflowDefinition.findUnique({ where: { id }, include: PEOPLE });
    if (!workflow) throw new NotFoundException(`Approval workflow ${id} was not found`);
    return { ...workflow, validationErrors: validateFlow(parseFlow(workflow.flowDefinition)) };
  }

  async versions(id: string) {
    await this.find(id);
    const versions = await this.prisma.approvalWorkflowVersion.findMany({
      where: { workflowId: id },
      select: { id: true, version: true, settings: true, createdById: true, createdAt: true, _count: { select: { requests: true } } },
      orderBy: { version: "desc" }
    });
    return versions.map(({ _count, ...version }) => ({ ...version, requestCount: _count.requests }));
  }

  async create(dto: CreateApprovalWorkflowDto, actorId?: string) {
    const flow = this.checkedFlow(dto.flowDefinition, dto.status === "active");

    const workflow = await this.prisma
      .$transaction(async (tx) => {
        const created = await tx.approvalWorkflowDefinition.create({
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
            flowDefinition: flow as Prisma.InputJsonValue,
            currentVersion: 1,
            createdById: actorId ?? null,
            updatedById: actorId ?? null
          },
          include: PEOPLE
        });
        await tx.approvalWorkflowVersion.create({
          data: { workflowId: created.id, version: 1, flowDefinition: flow as Prisma.InputJsonValue, settings: settingsOf(created), createdById: actorId ?? null }
        });
        await this.writeAudit(tx, "approval_workflow.create", created.id, null, created, actorId);
        return created;
      })
      .catch((error: unknown) => {
        throw this.knownError(error);
      });

    return workflow;
  }

  // AP-04. A change to the diagram or settings makes version N+1.
  async update(id: string, dto: UpdateApprovalWorkflowDto, actorId?: string) {
    const before = await this.find(id);
    const nextStatus = dto.status ?? before.status;
    const flow = dto.flowDefinition !== undefined ? this.checkedFlow(dto.flowDefinition, nextStatus === "active") : null;
    if (!flow && dto.status === "active" && before.status !== "active") this.checkedFlow(before.flowDefinition, true);

    const data: Prisma.ApprovalWorkflowDefinitionUncheckedUpdateInput = {
      ...(dto.code !== undefined ? { code: dto.code?.trim() || null } : {}),
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.objectType !== undefined ? { objectType: dto.objectType } : {}),
      ...(dto.subObject !== undefined ? { subObject: dto.subObject || "all" } : {}),
      ...(dto.versionMode !== undefined ? { versionMode: dto.versionMode } : {}),
      ...(dto.approvalType !== undefined ? { approvalType: dto.approvalType || "workflow" } : {}),
      ...(dto.followerId !== undefined ? { followerId: dto.followerId || null } : {}),
      ...(dto.showFlowInObject !== undefined ? { showFlowInObject: dto.showFlowInObject } : {}),
      ...(dto.allowAttachmentsAfterApproved !== undefined ? { allowAttachmentsAfterApproved: dto.allowAttachmentsAfterApproved } : {}),
      ...(dto.allowDocumentChangesAfterApproved !== undefined ? { allowDocumentChangesAfterApproved: dto.allowDocumentChangesAfterApproved } : {}),
      ...(dto.allowDiscussionAfterApproved !== undefined ? { allowDiscussionAfterApproved: dto.allowDiscussionAfterApproved } : {}),
      ...(dto.overdueAction !== undefined ? { overdueAction: dto.overdueAction || "none" } : {}),
      ...(flow ? { flowDefinition: flow as Prisma.InputJsonValue } : {}),
      updatedById: actorId ?? null
    };
    const versioned = Object.keys(dto).some((key) => VERSIONED_FIELDS.has(key) && (dto as Record<string, unknown>)[key] !== undefined);

    return this.prisma
      .$transaction(async (tx) => {
        const updated = await tx.approvalWorkflowDefinition.update({
          where: { id },
          data: versioned ? { ...data, currentVersion: { increment: 1 } } : data,
          include: PEOPLE
        });
        if (versioned) {
          await tx.approvalWorkflowVersion.create({
            data: {
              workflowId: id,
              version: updated.currentVersion,
              flowDefinition: updated.flowDefinition as Prisma.InputJsonValue,
              settings: settingsOf(updated),
              createdById: actorId ?? null
            }
          });
        }
        await this.writeAudit(tx, "approval_workflow.update", id, before, updated, actorId);
        return updated;
      })
      .catch((error: unknown) => {
        throw this.knownError(error);
      });
  }

  // AP-07. The copy starts inactive at version 1 so it can be edited before use.
  async duplicate(id: string, actorId?: string) {
    const source = await this.find(id);
    return this.create(
      {
        name: `${source.name} (bản sao)`,
        status: "draft",
        objectType: source.objectType,
        subObject: source.subObject,
        versionMode: source.versionMode,
        approvalType: source.approvalType,
        followerId: source.followerId ?? undefined,
        showFlowInObject: source.showFlowInObject,
        allowAttachmentsAfterApproved: source.allowAttachmentsAfterApproved,
        allowDocumentChangesAfterApproved: source.allowDocumentChangesAfterApproved,
        allowDiscussionAfterApproved: source.allowDiscussionAfterApproved,
        overdueAction: source.overdueAction,
        flowDefinition: source.flowDefinition as Record<string, unknown>
      },
      actorId
    );
  }

  // AP-08. Activating checks the diagram; deactivating leaves running requests on their version.
  activate(id: string, actorId?: string) {
    return this.update(id, { status: "active" }, actorId);
  }

  deactivate(id: string, actorId?: string) {
    return this.update(id, { status: "draft" }, actorId);
  }

  async delete(id: string, actorId?: string) {
    const workflow = await this.find(id);
    const used = await this.prisma.request.count({ where: { workflowVersion: { workflowId: id } } });
    if (used > 0) {
      throw new ConflictException("Quy trình đã có đơn sử dụng nên không xoá được. Hãy ngừng hoạt động quy trình.");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.approvalWorkflowDefinition.delete({ where: { id } });
      await this.writeAudit(tx, "approval_workflow.delete", id, workflow, null, actorId);
    });
    return { id, deleted: true };
  }

  private checkedFlow(value: unknown, mustBeValid: boolean) {
    const flow = sanitizeFlow(parseFlow(value));
    if (mustBeValid) {
      const errors = validateFlow(flow);
      if (errors.length > 0) {
        throw new BadRequestException({ message: "Sơ đồ quy trình chưa hợp lệ, chưa thể kích hoạt.", errors });
      }
    }
    return flow;
  }

  private async find(id: string) {
    const workflow = await this.prisma.approvalWorkflowDefinition.findUnique({ where: { id } });
    if (!workflow) throw new NotFoundException(`Approval workflow ${id} was not found`);
    return workflow;
  }

  private knownError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new BadRequestException("Workflow code already exists");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return new BadRequestException("Follower is not available");
    }
    return error;
  }

  private async writeAudit(tx: Prisma.TransactionClient, action: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    await tx.auditLog.create({
      data: {
        ...this.audit.contextFields(),
        actorId,
        action,
        entityType: "ApprovalWorkflowDefinition",
        entityId,
        beforeValue: json(before),
        afterValue: json(after)
      }
    });
  }
}
