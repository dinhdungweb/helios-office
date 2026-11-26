import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, type ApprovalAssigneeStatus, type ApprovalStepStatus, type ApprovalWorkflowVersion, type Request } from "@prisma/client";
import { AuditService } from "../../../common/audit/audit.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { ApprovalOrgService } from "./approval-org.service";
import { resolveApprovers, resolveAudience, type OrgChart, type ResolveResult } from "./approvers";
import { defaultFlow, parseFlow, sanitizeFlow, splitAudience, type FlowDefinition, type FlowNode } from "./flow";
import { RequestTypeRegistry, REQUEST_TYPE_LABEL, isRequestType, type HandlerContext } from "./request-types";
import { pickWorkflow, runFrom } from "./runner";

type Tx = Prisma.TransactionClient;

export type EngineActor = { employeeId: string; accountId?: string };

export type Notice = { event: string; employeeIds: string[]; title: string; body?: string; link?: string; requestId: string };

export type Decision = "approve" | "reject" | "return";

type LastApproval = { approverId: string; at: Date } | null;

const DECISION_STATUS: Record<Decision, ApprovalAssigneeStatus> = { approve: "approved", reject: "rejected", return: "returned" };

export function requestLink(requestId: string) {
  return `/user/requests/detail?id=${requestId}`;
}

function flowOf(version: Pick<ApprovalWorkflowVersion, "flowDefinition"> | null | undefined): FlowDefinition {
  return version ? parseFlow(version.flowDefinition) : defaultFlow();
}

function plainText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function deadline(node: FlowNode, from: Date): Date | null {
  const config = node.approvalConfig;
  const minutes = Number(config?.deadlineDays || 0) * 1440 + Number(config?.deadlineHours || 0) * 60 + Number(config?.deadlineMinutes || 0);
  return Number.isFinite(minutes) && minutes > 0 ? new Date(from.getTime() + minutes * 60_000) : null;
}

function json(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

// Runs requests through their workflow version and records every step and action
// (docs/design/approval-engine.md §5). Writes happen in one transaction per user action;
// notifications go out after it commits.
@Injectable()
export class ApprovalEngineService {
  private readonly logger = new Logger(ApprovalEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly registry: RequestTypeRegistry,
    private readonly org: ApprovalOrgService
  ) {}

  // §5.1 + §5.3. Called inside the caller's transaction (create-and-submit is one unit).
  async submit(tx: Tx, request: Request, actor: EngineActor): Promise<Notice[]> {
    if (request.status !== "draft" && request.status !== "returned") {
      throw new ConflictException("Chỉ gửi được đơn nháp hoặc đơn bị trả lại.");
    }
    const workflows = await tx.approvalWorkflowDefinition.findMany({
      where: { status: "active", objectType: request.type },
      select: { id: true, objectType: true, subObject: true, status: true, updatedAt: true, currentVersion: true }
    });
    const picked = pickWorkflow(workflows, request.type, request.subType);
    const version = picked
      ? await tx.approvalWorkflowVersion.findUnique({ where: { workflowId_version: { workflowId: picked.id, version: picked.currentVersion } } })
      : null;

    const round = request.round + 1;
    const submitted = await this.transition(tx, request, {
      status: "pending",
      round,
      submittedAt: new Date(),
      decidedAt: null,
      workflowVersionId: version?.id ?? null,
      usedDefaultWorkflow: !version,
      needsAttention: false
    });
    await tx.approvalAction.create({
      data: {
        requestId: request.id,
        actorId: actor.employeeId,
        action: round > 1 ? "resubmit" : "submit",
        data: { workflowId: picked?.id ?? null, version: version?.version ?? null, defaultWorkflow: !version }
      }
    });

    const settings = (version?.settings ?? {}) as { followerId?: string | null };
    if (settings.followerId) await this.addFollowers(tx, request.id, [settings.followerId], "workflow");
    await this.registry.get(request.type)?.onSubmitted?.(submitted, this.context(tx, submitted, actor));
    await this.writeAudit(tx, round > 1 ? "request.resubmit" : "request.submit", submitted, actor);

    return this.advance(tx, submitted, flowOf(version), "start", actor, null);
  }

  // §5.7: approve / reject / return by an assignee of an open step.
  async decide(stepId: string, actor: EngineActor, decision: Decision, reason?: string, expectedVersion?: number) {
    let requestId = "";
    const notices = await this.prisma.$transaction(async (tx) => {
      const step = await tx.approvalStep.findUnique({
        where: { id: stepId },
        include: { assignees: true, request: { include: { workflowVersion: true } } }
      });
      if (!step) throw new NotFoundException("Không tìm thấy bước duyệt.");
      const { workflowVersion, ...request } = step.request;
      requestId = request.id;
      if (expectedVersion !== undefined && expectedVersion !== request.version) throw this.staleError();
      if (request.status !== "pending" || step.status !== "active") throw this.staleError();

      const assignee = step.assignees.find((item) => item.employeeId === actor.employeeId);
      if (!assignee) throw new ForbiddenException("Bạn không phải người duyệt bước này.");
      if (assignee.status !== "pending") throw this.staleError();
      const note = reason?.trim() || null;
      if (decision !== "approve" && !note) throw new BadRequestException(decision === "reject" ? "Hãy nhập lý do từ chối." : "Hãy nhập lý do trả lại.");

      const flow = flowOf(workflowVersion);
      const node = flow.nodes.find((item) => item.id === step.nodeId);
      if (decision === "return" && node?.approvalConfig?.allowReturn === false) {
        throw new BadRequestException("Bước duyệt này không cho phép trả lại.");
      }

      const now = new Date();
      const claimed = await tx.approvalAssignee.updateMany({
        where: { id: assignee.id, status: "pending" },
        data: { status: DECISION_STATUS[decision], actedAt: now }
      });
      if (claimed.count === 0) throw this.staleError();
      await tx.approvalAction.create({
        data: {
          requestId: request.id,
          stepId,
          actorId: actor.employeeId,
          action: decision,
          reason: note,
          data: assignee.onBehalfOfId ? { onBehalfOfId: assignee.onBehalfOfId } : undefined
        }
      });

      const current = await this.transition(tx, request, {});
      await this.writeAudit(tx, `request.${decision}`, current, actor, { stepId, reason: note });

      if (decision === "approve") {
        const others = step.assignees.filter((item) => item.id !== assignee.id && item.status === "pending");
        if (step.mode === "all" && others.length > 0) return [];
        await this.closeStep(tx, stepId, "approved", "superseded");
        return this.advance(tx, current, flow, step.nodeId, actor, { approverId: actor.employeeId, at: now });
      }

      await this.closeStep(tx, stepId, decision === "reject" ? "rejected" : "returned", "superseded");
      const ended = await this.transition(tx, current, decision === "reject" ? { status: "rejected", decidedAt: now } : { status: "returned" });
      await this.registry.get(request.type)?.onWithdrawn?.(ended, this.context(tx, ended, actor));
      return [
        this.requesterNotice(
          ended,
          decision === "reject" ? "request.rejected" : "request.returned",
          decision === "reject" ? "bị từ chối" : "bị trả lại để bổ sung",
          note ?? undefined
        ),
        ...(await this.followerNotices(tx, ended, decision === "reject" ? "request.rejected" : "request.returned", decision === "reject" ? "bị từ chối" : "bị trả lại"))
      ];
    });

    await this.dispatch(notices, actor);
    return this.prisma.request.findUniqueOrThrow({ where: { id: requestId } });
  }

  // LV-06: the requester takes a pending request back to draft while nobody acted on the current step.
  async recall(requestId: string, actor: EngineActor) {
    const notices = await this.prisma.$transaction(async (tx) => {
      const request = await this.requestOf(tx, requestId);
      if (request.requesterId !== actor.employeeId) throw new ForbiddenException("Chỉ người tạo đơn được rút đơn.");
      if (request.status !== "pending") throw new ConflictException("Chỉ rút được đơn đang chờ duyệt.");
      const open = await tx.approvalStep.findMany({ where: { requestId, status: "active" }, include: { assignees: true } });
      if (open.some((step) => step.assignees.some((assignee) => assignee.status !== "pending"))) {
        throw new ConflictException("Đã có người xử lý bước hiện tại, không rút được đơn.");
      }
      for (const step of open) await this.closeStep(tx, step.id, "cancelled", "cancelled");
      const recalled = await this.transition(tx, request, { status: "draft" });
      await tx.approvalAction.create({ data: { requestId, actorId: actor.employeeId, action: "recall" } });
      await this.registry.get(request.type)?.onWithdrawn?.(recalled, this.context(tx, recalled, actor));
      await this.writeAudit(tx, "request.recall", recalled, actor);
      return [] as Notice[];
    });
    await this.dispatch(notices, actor);
    return this.prisma.request.findUniqueOrThrow({ where: { id: requestId } });
  }

  // LV-06 + §4. The requester cancels a request not yet approved; someone with
  // permission.requests.manage (asManager) may also cancel an approved one, with a reason.
  async cancel(requestId: string, actor: EngineActor, reason: string | undefined, asManager: boolean) {
    const notices = await this.prisma.$transaction(async (tx) => {
      const request = await this.requestOf(tx, requestId);
      const isRequester = request.requesterId === actor.employeeId;
      const note = reason?.trim() || null;
      const handler = this.registry.get(request.type);

      if (request.status === "approved") {
        if (!asManager) throw new ForbiddenException("Đơn đã duyệt chỉ HR huỷ được.");
        if (!note) throw new BadRequestException("Hãy nhập lý do huỷ đơn đã duyệt.");
        await this.assertPeriodsOpen(tx, handler?.affectedDates?.(request) ?? []);
        await handler?.onCancelledAfterApproval?.(request, this.context(tx, request, actor));
      } else if (request.status === "draft" || request.status === "returned" || request.status === "pending") {
        if (!isRequester && !asManager) throw new ForbiddenException("Bạn không huỷ được đơn này.");
        const open = await tx.approvalStep.findMany({ where: { requestId, status: "active" }, select: { id: true } });
        for (const step of open) await this.closeStep(tx, step.id, "cancelled", "cancelled");
        // A returned request already released what it held when it was returned.
        if (request.status === "pending") await handler?.onWithdrawn?.(request, this.context(tx, request, actor));
      } else {
        throw new ConflictException("Đơn đã kết thúc, không huỷ được.");
      }

      const cancelled = await this.transition(tx, request, { status: "cancelled", cancelReason: note, decidedAt: new Date() });
      await tx.approvalAction.create({ data: { requestId, actorId: actor.employeeId, action: "cancel", reason: note } });
      await this.writeAudit(tx, "request.cancel", cancelled, actor, { reason: note, asManager });
      return isRequester ? [] : [this.requesterNotice(cancelled, "request.cancelled", "đã bị huỷ", note ?? undefined)];
    });
    await this.dispatch(notices, actor);
    return this.prisma.request.findUniqueOrThrow({ where: { id: requestId } });
  }

  async dispatch(notices: Notice[], actor?: EngineActor) {
    for (const notice of notices) {
      if (notice.employeeIds.length === 0) continue;
      try {
        await this.notifications.notify({
          event: notice.event,
          recipients: { employeeIds: [...new Set(notice.employeeIds)] },
          title: notice.title,
          body: notice.body,
          link: notice.link,
          data: { requestId: notice.requestId },
          actorAccountId: actor?.accountId
        });
      } catch (error) {
        // The request is already saved; a failed notification must not undo it.
        this.logger.error(`Could not notify ${notice.event} for request ${notice.requestId}`, error as Error);
      }
    }
  }

  // Walks the diagram after `fromNodeId` and records what it reaches (§5.3).
  private async advance(tx: Tx, request: Request, flow: FlowDefinition, fromNodeId: string, actor: EngineActor, last: LastApproval): Promise<Notice[]> {
    const [org, delegations, fallbackAdminIds] = await Promise.all([
      this.org.orgChart(tx),
      this.org.delegations(tx, new Date()),
      this.org.fallbackAdminIds(tx)
    ]);
    const handler = this.registry.get(request.type);
    const record = this.conditionRecord(request, org, last);
    const result = runFrom(sanitizeFlow(flow), fromNodeId, {
      record,
      resolve: (node, isLastApproval): ResolveResult =>
        resolveApprovers(org, {
          approverValue: node.approvalConfig?.approverId ?? "",
          substituteValue: node.approvalConfig?.substituteId,
          requesterId: request.requesterId,
          requestType: request.type,
          selfApproval: node.approvalConfig?.selfApproval ?? "skip",
          escalateIfOnlySelf: isLastApproval,
          delegations,
          fallbackAdminIds
        })
    });

    const notices: Notice[] = [];
    const now = new Date();

    for (const event of result.events) {
      if (event.kind === "notify") {
        notices.push(this.nodeNotice(event.node, request, org, last));
        await tx.approvalAction.create({ data: { requestId: request.id, actorType: "system", action: "notify", data: { nodeId: event.node.id } } });
      } else {
        const skipped = await tx.approvalStep.create({
          data: { requestId: request.id, nodeId: event.node.id, name: this.stepName(event.node), status: "skipped", round: request.round, closedAt: now }
        });
        await tx.approvalAction.create({
          data: { requestId: request.id, stepId: skipped.id, actorType: "system", action: "auto_skipped", reason: "Người duyệt trùng người tạo đơn." }
        });
      }
    }

    const outcome = result.outcome;
    switch (outcome.kind) {
      case "step": {
        const node = outcome.node;
        const step = await tx.approvalStep.create({
          data: {
            requestId: request.id,
            nodeId: node.id,
            name: this.stepName(node),
            mode: node.approvalConfig?.approvalMode === "all" ? "all" : "any",
            round: request.round,
            dueAt: deadline(node, now),
            assignees: {
              create: outcome.resolved.assignees.map((item) => ({ employeeId: item.employeeId, resolvedFrom: item.resolvedFrom, onBehalfOfId: item.onBehalfOfId ?? null }))
            }
          }
        });
        if (outcome.resolved.needsAttention && !request.needsAttention) await this.transition(tx, request, { needsAttention: true });
        const nodeFollowers = splitAudience(node.approvalConfig?.followerId);
        if (nodeFollowers.length > 0) {
          await this.addFollowers(tx, request.id, nodeFollowers.flatMap((value) => resolveAudience(org, value, request.requesterId).map((item) => item.employeeId)), "node");
        }
        notices.push({
          event: "approval.assigned",
          employeeIds: outcome.resolved.assignees.map((item) => item.employeeId),
          title: `${this.label(request)} ${request.code} cần bạn duyệt`,
          body: `${step.name}: ${request.title}`,
          link: requestLink(request.id),
          requestId: request.id
        });
        return notices;
      }
      case "approved": {
        await this.assertPeriodsOpen(tx, handler?.affectedDates?.(request) ?? []);
        const approved = await this.transition(tx, request, { status: "approved", decidedAt: now, needsAttention: false });
        await handler?.onApproved?.(approved, this.context(tx, approved, actor));
        await tx.approvalAction.create({ data: { requestId: request.id, actorType: "system", action: "complete", data: { outcome: "approved" } } });
        return [...notices, this.requesterNotice(approved, "request.approved", "đã được duyệt"), ...(await this.followerNotices(tx, approved, "request.approved", "đã được duyệt"))];
      }
      case "rejected": {
        const rejected = await this.transition(tx, request, { status: "rejected", decidedAt: now });
        await handler?.onWithdrawn?.(rejected, this.context(tx, rejected, actor));
        await tx.approvalAction.create({ data: { requestId: request.id, actorType: "system", action: "complete", data: { outcome: "rejected" } } });
        return [...notices, this.requesterNotice(rejected, "request.rejected", "không được duyệt")];
      }
      case "error": {
        await this.transition(tx, request, { needsAttention: true });
        await tx.approvalAction.create({ data: { requestId: request.id, actorType: "system", action: "error", reason: outcome.message } });
        this.logger.warn(`Request ${request.code}: ${outcome.message}`);
        return notices;
      }
    }
  }

  private conditionRecord(request: Request, org: OrgChart, last: LastApproval): Record<string, unknown> {
    const requester = org.employees.get(request.requesterId);
    const day = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
    return {
      ...(this.registry.get(request.type)?.conditionRecord(request) ?? {}),
      type: request.type,
      sub_type: request.subType,
      created_by: request.requesterId,
      department: requester?.departmentId ?? null,
      position: requester?.positionId ?? null,
      job_title: requester?.jobTitleId ?? null,
      status: request.status,
      created_at: request.createdAt.toISOString(),
      from_date: day(request.fromDate),
      to_date: day(request.toDate),
      quantity: request.quantity === null ? null : Number(request.quantity),
      approval_by: last?.approverId ?? null,
      approved_at: last?.at.toISOString() ?? null
    };
  }

  private nodeNotice(node: FlowNode, request: Request, org: OrgChart, last: LastApproval): Notice {
    const config = node.type === "email" ? node.emailConfig : node.notificationConfig;
    const recipients = splitAudience(config?.recipientId).flatMap((value) => {
      if (value === "dynamic:created_by" || value === "dynamic:post_creator") return [request.requesterId];
      if (value === "dynamic:approval_user") return last ? [last.approverId] : [];
      return resolveAudience(org, value, request.requesterId).map((item) => item.employeeId);
    });
    const subject = node.type === "email" ? node.emailConfig?.subject : undefined;
    return {
      event: "approval.workflow_notice",
      employeeIds: recipients,
      title: subject || config?.title || `${this.label(request)} ${request.code}`,
      body: plainText(config?.content ?? "") || undefined,
      link: requestLink(request.id),
      requestId: request.id
    };
  }

  private requesterNotice(request: Request, event: string, verb: string, body?: string): Notice {
    return { event, employeeIds: [request.requesterId], title: `${this.label(request)} ${request.code} ${verb}`, body, link: requestLink(request.id), requestId: request.id };
  }

  private async followerNotices(tx: Tx, request: Request, event: string, verb: string): Promise<Notice[]> {
    const followers = await tx.requestFollower.findMany({ where: { requestId: request.id }, select: { employeeId: true } });
    const ids = followers.map((item) => item.employeeId).filter((id) => id !== request.requesterId);
    return ids.length > 0 ? [{ event, employeeIds: ids, title: `${this.label(request)} ${request.code} ${verb}`, link: requestLink(request.id), requestId: request.id }] : [];
  }

  private async addFollowers(tx: Tx, requestId: string, employeeIds: string[], source: string) {
    const ids = [...new Set(employeeIds.filter(Boolean))];
    if (ids.length === 0) return;
    await tx.requestFollower.createMany({ data: ids.map((employeeId) => ({ requestId, employeeId, source })), skipDuplicates: true });
  }

  // Every state change bumps Request.version; a concurrent change makes this fail (§5.7).
  private async transition(tx: Tx, request: Request, data: Prisma.RequestUncheckedUpdateManyInput): Promise<Request> {
    const result = await tx.request.updateMany({ where: { id: request.id, version: request.version }, data: { ...data, version: { increment: 1 } } });
    if (result.count === 0) throw this.staleError();
    return tx.request.findUniqueOrThrow({ where: { id: request.id } });
  }

  private async closeStep(tx: Tx, stepId: string, status: ApprovalStepStatus, others: ApprovalAssigneeStatus) {
    await tx.approvalStep.update({ where: { id: stepId }, data: { status, closedAt: new Date() } });
    await tx.approvalAssignee.updateMany({ where: { stepId, status: "pending" }, data: { status: others } });
  }

  private async assertPeriodsOpen(tx: Tx, dates: string[]) {
    const months = [...new Set(dates.map((date) => date.slice(0, 7)))];
    if (months.length === 0) return;
    const locked = await tx.attendancePeriod.findMany({ where: { month: { in: months }, status: "locked" }, select: { month: true } });
    if (locked.length > 0) {
      throw new BadRequestException(`Kỳ công ${locked.map((item) => item.month).join(", ")} đã chốt. Cần mở chốt trước khi duyệt hoặc huỷ đơn này.`);
    }
  }

  private async requestOf(tx: Tx, id: string) {
    const request = await tx.request.findUnique({ where: { id } });
    if (!request) throw new NotFoundException("Không tìm thấy đơn.");
    return request;
  }

  private context(tx: Tx, request: Request, actor: EngineActor): HandlerContext {
    return { tx, requesterId: request.requesterId, actorId: actor.employeeId };
  }

  private stepName(node: FlowNode) {
    return node.approvalConfig?.name || node.label || "Bước duyệt";
  }

  private label(request: Request) {
    return isRequestType(request.type) ? REQUEST_TYPE_LABEL[request.type] : "Đơn";
  }

  private staleError() {
    return new ConflictException("Đơn đã được xử lý hoặc thay đổi. Hãy tải lại để xem trạng thái mới nhất.");
  }

  private async writeAudit(tx: Tx, action: string, request: Request, actor: EngineActor, extra: Record<string, unknown> = {}) {
    await tx.auditLog.create({
      data: {
        ...this.audit.contextFields(),
        actorId: actor.employeeId,
        action,
        entityType: "Request",
        entityId: request.id,
        afterValue: json({ code: request.code, status: request.status, round: request.round, version: request.version, ...extra })
      }
    });
  }
}
