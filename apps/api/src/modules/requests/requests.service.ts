import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Request } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import type { ResolvedScope } from "../../common/data-scope/data-scope.types";
import { paginated, pageArgs, sortArgs } from "../../common/pagination/list-query";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ApprovalEngineService, type EngineActor, type Notice } from "../approvals/engine/approval-engine.service";
import { parseFlow } from "../approvals/engine/flow";
import { REQUEST_CODE_PREFIX, REQUEST_TYPE_LABEL, RequestTypeRegistry, isRequestType, type RequestType } from "../approvals/engine/request-types";
import type { CreateRequestDto, RequestListQueryDto, UpdateRequestDto } from "./requests.dto";

type Tx = Prisma.TransactionClient;

export const REQUEST_VIEW_PERMISSIONS = ["permission.requests.view", "permission.requests.manage"] as const;
export const REQUEST_MANAGE_PERMISSIONS = ["permission.requests.manage"] as const;

const PERSON = { select: { id: true, code: true, fullName: true, avatarUrl: true, department: { select: { id: true, name: true } } } } as const;

const LIST_INCLUDE = {
  requester: PERSON,
  steps: {
    where: { status: "active" as const },
    select: { id: true, name: true, dueAt: true, assignees: { select: { employeeId: true, status: true, employee: { select: { id: true, fullName: true, avatarUrl: true } } } } }
  }
} satisfies Prisma.RequestInclude;

const DETAIL_INCLUDE = {
  requester: PERSON,
  workflowVersion: { select: { id: true, version: true, settings: true, flowDefinition: true, workflow: { select: { id: true, name: true } } } },
  steps: {
    orderBy: { openedAt: "asc" as const },
    include: { assignees: { include: { employee: { select: { id: true, fullName: true, avatarUrl: true } } } } }
  },
  followers: true
} satisfies Prisma.RequestInclude;

function dateOnly(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function companyYear(now = new Date()) {
  return new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric" }).format(now);
}

// Requests of every type (LV-02 → LV-07) and the approver's inbox / timeline (AP-14, AP-19).
// Type-specific rules live in the handlers; the approval flow lives in ApprovalEngineService.
@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly dataScope: DataScopeService,
    private readonly engine: ApprovalEngineService,
    private readonly registry: RequestTypeRegistry
  ) {}

  // Request types that can be created now, with their condition fields for the workflow designer.
  types() {
    return this.registry.types().map((type) => ({
      type,
      label: isRequestType(type) ? REQUEST_TYPE_LABEL[type] : type,
      conditionFields: this.registry.require(type).conditionFields()
    }));
  }

  async create(user: AuthenticatedUser, dto: CreateRequestDto) {
    const actor = this.actor(user);
    const handler = this.registry.get(dto.type);
    if (!handler) throw new BadRequestException(`${REQUEST_TYPE_LABEL[dto.type]} chưa được hỗ trợ.`);

    let notices: Notice[] = [];
    const created = await this.prisma.$transaction(async (tx) => {
      const { payload, summary } = await handler.prepare(dto.payload, { tx, requesterId: actor.employeeId, actorId: actor.employeeId });
      const request = await tx.request.create({
        data: {
          code: await this.nextCode(tx, dto.type),
          type: dto.type,
          subType: summary.subType ?? null,
          requesterId: actor.employeeId,
          status: "draft",
          title: summary.title,
          payload: payload as Prisma.InputJsonValue,
          fromDate: summary.fromDate ?? null,
          toDate: summary.toDate ?? null,
          quantity: summary.quantity ?? null,
          unit: summary.unit ?? null
        }
      });
      await this.setFollowers(tx, request.id, dto.followerIds ?? [], actor.employeeId);
      await tx.approvalAction.create({ data: { requestId: request.id, actorId: actor.employeeId, action: "create" } });
      await this.writeAudit(tx, "request.create", request, actor);
      if (dto.submit) notices = await this.engine.submit(tx, request, actor);
      return request;
    });

    await this.engine.dispatch(notices, actor);
    return this.detail(user, created.id);
  }

  // LV-05: the requester edits a draft or a returned request.
  async update(user: AuthenticatedUser, id: string, dto: UpdateRequestDto) {
    const actor = this.actor(user);
    await this.prisma.$transaction(async (tx) => {
      const request = await this.own(tx, id, actor);
      if (request.status !== "draft" && request.status !== "returned") throw new ConflictException("Chỉ sửa được đơn nháp hoặc đơn bị trả lại.");
      if (dto.version !== undefined && dto.version !== request.version) throw this.staleError();

      const { payload, summary } = await this.registry.require(request.type).prepare(dto.payload, { tx, requesterId: request.requesterId, actorId: actor.employeeId, requestId: id });
      const result = await tx.request.updateMany({
        where: { id, version: request.version },
        data: {
          subType: summary.subType ?? null,
          title: summary.title,
          payload: payload as Prisma.InputJsonValue,
          fromDate: summary.fromDate ?? null,
          toDate: summary.toDate ?? null,
          quantity: summary.quantity ?? null,
          unit: summary.unit ?? null,
          version: { increment: 1 }
        }
      });
      if (result.count === 0) throw this.staleError();
      if (dto.followerIds) await this.setFollowers(tx, id, dto.followerIds, actor.employeeId, true);
      await this.writeAudit(tx, "request.update", { ...request, version: request.version + 1 }, actor);
    });
    return this.detail(user, id);
  }

  async submit(user: AuthenticatedUser, id: string) {
    const actor = this.actor(user);
    let notices: Notice[] = [];
    await this.prisma.$transaction(async (tx) => {
      const request = await this.own(tx, id, actor);
      notices = await this.engine.submit(tx, request, actor);
    });
    await this.engine.dispatch(notices, actor);
    return this.detail(user, id);
  }

  async recall(user: AuthenticatedUser, id: string) {
    await this.engine.recall(id, this.actor(user));
    return this.detail(user, id);
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const actor = this.actor(user);
    const request = await this.find(id);
    const asManager = await this.inScope(user, REQUEST_MANAGE_PERMISSIONS, request.requesterId);
    await this.engine.cancel(id, actor, reason, asManager);
    return this.detail(user, id);
  }

  async decide(user: AuthenticatedUser, stepId: string, action: "approve" | "reject" | "return", reason?: string, version?: number) {
    const request = await this.engine.decide(stepId, this.actor(user), action, reason, version);
    return this.detail(user, request.id);
  }

  // LV-03 + AP-14.
  async list(user: AuthenticatedUser, query: RequestListQueryDto) {
    const box = query.box ?? "mine";
    const me = user.account?.employeeId ?? null;
    const filters: Prisma.RequestWhereInput[] = [];

    if (box === "all") {
      const scope = await this.hrScope(user, REQUEST_VIEW_PERMISSIONS);
      if (!scope) throw new ForbiddenException("Bạn không có quyền xem đơn của người khác.");
      if (scope.level !== "company") filters.push({ requester: this.dataScope.employeeWhere(scope) });
      filters.push({ status: { not: "draft" } });
    } else if (!me) {
      return paginated([], 0, query);
    } else if (box === "mine") {
      filters.push({ requesterId: me });
    } else if (box === "to_approve") {
      filters.push({ status: "pending", steps: { some: { status: "active", assignees: { some: { employeeId: me, status: "pending" } } } } });
    } else if (box === "processed") {
      filters.push({ steps: { some: { assignees: { some: { employeeId: me, status: { not: "pending" } } } } } });
    } else {
      filters.push({ followers: { some: { employeeId: me } }, status: { not: "draft" } });
    }

    if (query.type) filters.push({ type: query.type });
    if (query.status) filters.push({ status: query.status });
    if (query.from) filters.push({ OR: [{ toDate: { gte: new Date(`${query.from}T00:00:00.000Z`) } }, { toDate: null }] });
    if (query.to) filters.push({ OR: [{ fromDate: { lte: new Date(`${query.to}T00:00:00.000Z`) } }, { fromDate: null }] });
    if (query.q?.trim()) {
      const q = query.q.trim();
      filters.push({ OR: [{ code: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }, { requester: { fullName: { contains: q, mode: "insensitive" } } }] });
    }

    const where: Prisma.RequestWhereInput = { AND: filters };
    const { skip, take } = pageArgs(query);
    const [rows, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: sortArgs(query, ["createdAt", "submittedAt", "fromDate", "code"], "createdAt"),
        skip,
        take
      }),
      this.prisma.request.count({ where })
    ]);

    return paginated(
      rows.map((row) => ({
        ...this.summary(row),
        requester: row.requester,
        currentStep: row.steps[0]
          ? {
              id: row.steps[0].id,
              name: row.steps[0].name,
              dueAt: row.steps[0].dueAt,
              assignees: row.steps[0].assignees.map((item) => ({ ...item.employee, status: item.status }))
            }
          : null,
        myStepId: me ? (row.steps.find((step) => step.assignees.some((item) => item.employeeId === me && item.status === "pending"))?.id ?? null) : null
      })),
      total,
      query
    );
  }

  // LV-04.
  async detail(user: AuthenticatedUser, id: string) {
    const request = await this.prisma.request.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!request) throw new NotFoundException("Không tìm thấy đơn.");
    const access = await this.access(user, request);
    if (!access.canView) throw new NotFoundException("Không tìm thấy đơn.");

    const me = user.account?.employeeId ?? null;
    const myStep = me
      ? request.steps.find((step) => step.status === "active" && step.assignees.some((item) => item.employeeId === me && item.status === "pending"))
      : undefined;
    const node = myStep ? parseFlow(request.workflowVersion?.flowDefinition).nodes.find((item) => item.id === myStep.nodeId) : undefined;
    const followers = await this.prisma.employee.findMany({
      where: { id: { in: request.followers.map((item) => item.employeeId) } },
      select: { id: true, fullName: true, avatarUrl: true }
    });
    const isRequester = me === request.requesterId;
    const editable = request.status === "draft" || request.status === "returned";

    return {
      ...this.summary(request),
      payload: request.payload,
      requester: request.requester,
      workflow: request.workflowVersion
        ? { id: request.workflowVersion.workflow.id, name: request.workflowVersion.workflow.name, version: request.workflowVersion.version }
        : null,
      steps: request.steps.map((step) => ({
        id: step.id,
        nodeId: step.nodeId,
        name: step.name,
        mode: step.mode,
        status: step.status,
        round: step.round,
        dueAt: step.dueAt,
        openedAt: step.openedAt,
        closedAt: step.closedAt,
        assignees: step.assignees.map((item) => ({
          ...item.employee,
          status: item.status,
          resolvedFrom: item.resolvedFrom,
          onBehalfOfId: item.onBehalfOfId,
          actedAt: item.actedAt
        }))
      })),
      followers,
      permissions: {
        canEdit: isRequester && editable,
        canSubmit: isRequester && editable,
        canRecall: isRequester && request.status === "pending" && !request.steps.some((step) => step.status === "active" && step.assignees.some((item) => item.status !== "pending")),
        canCancel: (isRequester && ["draft", "returned", "pending"].includes(request.status)) || (access.canManage && !["rejected", "cancelled"].includes(request.status)),
        myStepId: myStep?.id ?? null,
        canReturn: Boolean(myStep) && node?.approvalConfig?.allowReturn !== false,
        canComment: access.canComment
      }
    };
  }

  // AP-19: steps, actions and comments in order.
  async timeline(user: AuthenticatedUser, id: string) {
    const request = await this.find(id);
    if (!(await this.access(user, request)).canView) throw new NotFoundException("Không tìm thấy đơn.");
    const [actions, comments] = await Promise.all([
      this.prisma.approvalAction.findMany({ where: { requestId: id }, include: { step: { select: { id: true, name: true, round: true } } }, orderBy: { createdAt: "asc" } }),
      this.prisma.requestComment.findMany({ where: { requestId: id }, orderBy: { createdAt: "asc" } })
    ]);
    const people = await this.prisma.employee.findMany({
      where: { id: { in: [...new Set([...actions.map((item) => item.actorId), ...comments.map((item) => item.authorId)].filter((value): value is string => Boolean(value)))] } },
      select: { id: true, fullName: true, avatarUrl: true }
    });
    const byId = new Map(people.map((person) => [person.id, person]));

    return [
      ...actions.map((action) => ({
        kind: "action" as const,
        id: action.id,
        action: action.action,
        actorType: action.actorType,
        actor: action.actorId ? (byId.get(action.actorId) ?? null) : null,
        step: action.step,
        reason: action.reason,
        data: action.data,
        at: action.createdAt
      })),
      ...comments.map((comment) => ({ kind: "comment" as const, id: comment.id, author: byId.get(comment.authorId) ?? null, body: comment.body, at: comment.createdAt }))
    ].sort((left, right) => left.at.getTime() - right.at.getTime());
  }

  // LV-07.
  async comments(user: AuthenticatedUser, id: string) {
    const request = await this.find(id);
    if (!(await this.access(user, request)).canView) throw new NotFoundException("Không tìm thấy đơn.");
    const comments = await this.prisma.requestComment.findMany({ where: { requestId: id }, orderBy: { createdAt: "asc" } });
    const people = await this.prisma.employee.findMany({ where: { id: { in: comments.map((item) => item.authorId) } }, select: { id: true, fullName: true, avatarUrl: true } });
    const byId = new Map(people.map((person) => [person.id, person]));
    return comments.map((comment) => ({ ...comment, author: byId.get(comment.authorId) ?? null }));
  }

  async addComment(user: AuthenticatedUser, id: string, body: string) {
    const actor = this.actor(user);
    const request = await this.prisma.request.findUnique({ where: { id }, include: { workflowVersion: { select: { settings: true } } } });
    if (!request) throw new NotFoundException("Không tìm thấy đơn.");
    const access = await this.access(user, request);
    if (!access.canView) throw new NotFoundException("Không tìm thấy đơn.");
    if (!access.canComment) throw new ForbiddenException("Đơn đã duyệt không cho phép thảo luận thêm.");

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.requestComment.create({ data: { requestId: id, authorId: actor.employeeId, body: body.trim() } });
      await this.writeAudit(tx, "request.comment", request, actor, { commentId: created.id });
      return created;
    });
    return comment;
  }

  private async access(user: AuthenticatedUser, request: Request & { workflowVersion?: { settings: Prisma.JsonValue } | null }) {
    const me = user.account?.employeeId ?? null;
    let involved = me === request.requesterId;
    if (!involved && me) {
      const [assigned, following] = await Promise.all([
        this.prisma.approvalAssignee.count({ where: { employeeId: me, step: { requestId: request.id } } }),
        this.prisma.requestFollower.count({ where: { employeeId: me, requestId: request.id } })
      ]);
      involved = assigned > 0 || following > 0;
    }
    const canManage = await this.inScope(user, REQUEST_MANAGE_PERMISSIONS, request.requesterId);
    const canView = involved || canManage || (request.status !== "draft" && (await this.inScope(user, REQUEST_VIEW_PERMISSIONS, request.requesterId)));
    const settings = (request.workflowVersion?.settings ?? {}) as { allowDiscussionAfterApproved?: boolean };
    const discussionClosed = request.status === "approved" && settings.allowDiscussionAfterApproved === false;
    return { canView, canManage, canComment: canView && Boolean(me) && !discussionClosed && request.status !== "draft" };
  }

  // The account's scope for these permissions, or null when it holds none of them.
  private async hrScope(user: AuthenticatedUser, keys: readonly string[]): Promise<ResolvedScope | null> {
    const account = user.account;
    if (!account) return null;
    if (account.adminRole !== "system_admin") {
      const grants = await this.dataScope.grantsFor(account.id, keys);
      if (grants.length === 0) return null;
    }
    return this.dataScope.resolve(user, keys);
  }

  private async inScope(user: AuthenticatedUser, keys: readonly string[], employeeId: string) {
    const scope = await this.hrScope(user, keys);
    if (!scope) return false;
    if (scope.level === "company") return true;
    if (scope.employeeIds.includes(employeeId)) return true;
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { departmentId: true } });
    return Boolean(employee && scope.departmentIds.includes(employee.departmentId));
  }

  private summary(request: Request) {
    return {
      id: request.id,
      code: request.code,
      type: request.type,
      typeLabel: isRequestType(request.type) ? REQUEST_TYPE_LABEL[request.type] : request.type,
      subType: request.subType,
      status: request.status,
      title: request.title,
      fromDate: dateOnly(request.fromDate),
      toDate: dateOnly(request.toDate),
      quantity: request.quantity === null ? null : Number(request.quantity),
      unit: request.unit,
      round: request.round,
      version: request.version,
      needsAttention: request.needsAttention,
      usedDefaultWorkflow: request.usedDefaultWorkflow,
      submittedAt: request.submittedAt,
      decidedAt: request.decidedAt,
      cancelReason: request.cancelReason,
      createdAt: request.createdAt
    };
  }

  private async setFollowers(tx: Tx, requestId: string, employeeIds: string[], requesterId: string, replace = false) {
    const ids = [...new Set(employeeIds.filter((item) => item && item !== requesterId))];
    if (replace) await tx.requestFollower.deleteMany({ where: { requestId, source: "requester_choice", employeeId: { notIn: ids } } });
    if (ids.length === 0) return;
    const existing = await tx.employee.count({ where: { id: { in: ids } } });
    if (existing !== ids.length) throw new BadRequestException("Có người theo dõi không tồn tại.");
    await tx.requestFollower.createMany({ data: ids.map((employeeId) => ({ requestId, employeeId, source: "requester_choice" })), skipDuplicates: true });
  }

  private async nextCode(tx: Tx, type: RequestType) {
    const [row] = await tx.$queryRaw<Array<{ value: bigint }>>`SELECT nextval('request_code_seq') AS value`;
    return `${REQUEST_CODE_PREFIX[type]}-${companyYear()}-${String(row.value).padStart(6, "0")}`;
  }

  private async own(tx: Tx, id: string, actor: EngineActor) {
    const request = await tx.request.findUnique({ where: { id } });
    if (!request) throw new NotFoundException("Không tìm thấy đơn.");
    if (request.requesterId !== actor.employeeId) throw new ForbiddenException("Chỉ người tạo đơn được làm việc này.");
    return request;
  }

  private async find(id: string) {
    const request = await this.prisma.request.findUnique({ where: { id }, include: { workflowVersion: { select: { settings: true } } } });
    if (!request) throw new NotFoundException("Không tìm thấy đơn.");
    return request;
  }

  private actor(user: AuthenticatedUser): EngineActor {
    const employeeId = user.account?.employeeId;
    if (!employeeId) throw new ForbiddenException("Tài khoản chưa gắn hồ sơ nhân sự nên chưa dùng được đơn từ.");
    return { employeeId, accountId: user.account?.id };
  }

  private staleError() {
    return new ConflictException("Đơn đã được thay đổi ở nơi khác. Hãy tải lại.");
  }

  private async writeAudit(tx: Tx, action: string, request: Request, actor: EngineActor, extra: Record<string, unknown> = {}) {
    await tx.auditLog.create({
      data: {
        ...this.audit.contextFields(),
        actorId: actor.employeeId,
        action,
        entityType: "Request",
        entityId: request.id,
        afterValue: JSON.parse(JSON.stringify({ code: request.code, type: request.type, status: request.status, version: request.version, ...extra })) as Prisma.InputJsonValue
      }
    });
  }
}
