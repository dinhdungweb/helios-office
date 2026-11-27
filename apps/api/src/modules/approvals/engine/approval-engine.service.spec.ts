import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { Request } from "@prisma/client";
import { ApprovalEngineService } from "./approval-engine.service";
import type { OrgChart, OrgEmployee } from "./approvers";
import type { FlowDefinition } from "./flow";
import { RequestTypeRegistry } from "./request-types";

// In-memory stand-in for the Prisma calls the engine makes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loosely typed in-memory test double
type Row = Record<string, any>;

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (condition && typeof condition === "object" && !Array.isArray(condition) && !(condition instanceof Date)) {
      if ("in" in condition) return condition.in.includes(row[key]);
      if ("not" in condition) return row[key] !== condition.not;
      return matches(row[key] ?? {}, condition);
    }
    return row[key] === condition;
  });
}

function fakePrisma() {
  let seq = 0;
  const id = (prefix: string) => `${prefix}-${++seq}`;
  const db = {
    requests: [] as Row[],
    workflows: [] as Row[],
    versions: [] as Row[],
    steps: [] as Row[],
    assignees: [] as Row[],
    actions: [] as Row[],
    followers: [] as Row[],
    periods: [] as Row[],
    audits: [] as Row[]
  };
  const apply = (row: Row, data: Row) => {
    for (const [key, value] of Object.entries(data)) {
      row[key] = value && typeof value === "object" && "increment" in value ? row[key] + value.increment : value;
    }
    return row;
  };
  const withAssignees = (step: Row) => ({ ...step, assignees: db.assignees.filter((item) => item.stepId === step.id) });

  const client: Row = {
    request: {
      findUnique: async ({ where }: Row) => db.requests.find((row) => row.id === where.id) ?? null,
      findUniqueOrThrow: async ({ where }: Row) => ({ ...db.requests.find((row) => row.id === where.id)! }),
      updateMany: async ({ where, data }: Row) => {
        const rows = db.requests.filter((row) => matches(row, where));
        rows.forEach((row) => apply(row, data));
        return { count: rows.length };
      }
    },
    approvalWorkflowDefinition: { findMany: async ({ where }: Row) => db.workflows.filter((row) => matches(row, where)) },
    approvalWorkflowVersion: {
      findUnique: async ({ where }: Row) =>
        db.versions.find((row) => row.workflowId === where.workflowId_version.workflowId && row.version === where.workflowId_version.version) ?? null
    },
    approvalAction: { create: async ({ data }: Row) => db.actions.push({ id: id("act"), ...data }) },
    approvalStep: {
      create: async ({ data }: Row) => {
        const { assignees, ...rest } = data;
        const step = { id: id("step"), status: "active", mode: "any", ...rest };
        db.steps.push(step);
        for (const assignee of assignees?.create ?? []) db.assignees.push({ id: id("asg"), stepId: step.id, status: "pending", ...assignee });
        return step;
      },
      findUnique: async ({ where }: Row) => {
        const step = db.steps.find((row) => row.id === where.id);
        if (!step) return null;
        const request = db.requests.find((row) => row.id === step.requestId)!;
        return { ...withAssignees(step), request: { ...request, workflowVersion: db.versions.find((row) => row.id === request.workflowVersionId) ?? null } };
      },
      findMany: async ({ where }: Row) => db.steps.filter((row) => matches(row, where)).map(withAssignees),
      update: async ({ where, data }: Row) => apply(db.steps.find((row) => row.id === where.id)!, data)
    },
    approvalAssignee: {
      updateMany: async ({ where, data }: Row) => {
        const rows = db.assignees.filter((row) => matches(row, where));
        rows.forEach((row) => apply(row, data));
        return { count: rows.length };
      }
    },
    requestFollower: {
      createMany: async ({ data }: Row) => data.forEach((row: Row) => db.followers.some((item) => item.employeeId === row.employeeId && item.requestId === row.requestId) || db.followers.push(row)),
      findMany: async ({ where }: Row) => db.followers.filter((row) => matches(row, where))
    },
    attendancePeriod: { findMany: async ({ where }: Row) => db.periods.filter((row) => matches(row, where)) },
    auditLog: { create: async ({ data }: Row) => db.audits.push(data) }
  };
  client.$transaction = async (run: (tx: Row) => unknown) => run(client);
  return { client, db };
}

const person = (id: string, managerId: string | null, departmentId = "sales"): OrgEmployee => ({ id, managerId, departmentId, positionId: null, jobTitleId: null, active: true });

const org: OrgChart = {
  employees: new Map(
    [person("ceo", null, "hq"), person("head", "ceo"), person("staff", "head"), person("hr", "ceo", "hq"), person("peer", "head"), person("admin", "ceo", "hq")].map((item) => [item.id, item])
  ),
  departments: new Map([
    ["hq", { id: "hq", parentId: null, headId: "ceo", permissionStructure: "company" }],
    ["sales", { id: "sales", parentId: "hq", headId: "head", permissionStructure: "department" }]
  ])
};

const twoSteps: FlowDefinition = {
  nodes: [
    { id: "start", type: "start" },
    { id: "manager", type: "approval", approvalConfig: { name: "Quản lý", approverId: "automatic:direct_manager" } },
    { id: "hr", type: "approval", approvalConfig: { name: "HCNS", approverId: "hr", followerId: "peer" } },
    { id: "ok", type: "approved" }
  ],
  edges: [
    { source: "start", target: "manager" },
    { source: "manager", target: "hr" },
    { source: "hr", target: "ok" }
  ]
};

function setup(flow: FlowDefinition | null = twoSteps) {
  const { client, db } = fakePrisma();
  if (flow) {
    db.workflows.push({ id: "wf", objectType: "leave", subObject: "all", status: "active", updatedAt: new Date(), currentVersion: 1 });
    db.versions.push({ id: "wf-v1", workflowId: "wf", version: 1, flowDefinition: flow, settings: {} });
  }
  const handler = {
    type: "leave" as const,
    prepare: jest.fn(),
    conditionFields: () => [],
    conditionRecord: () => ({ total_days: 2 }),
    onSubmitted: jest.fn(),
    onWithdrawn: jest.fn(),
    onApproved: jest.fn(),
    onCancelledAfterApproval: jest.fn(),
    affectedDates: () => ["2026-12-01"]
  };
  const registry = new RequestTypeRegistry();
  registry.register(handler as never);
  const notifications = { notify: jest.fn().mockResolvedValue({ queued: true }) };
  const orgService = { orgChart: async () => org, delegations: async () => [], fallbackAdminIds: async () => ["admin"] };
  const engine = new ApprovalEngineService(client as never, { contextFields: () => ({}) } as never, notifications as never, registry, orgService as never);

  const draft: Request = {
    id: "req-1",
    code: "NP-2026-000001",
    type: "leave",
    subType: "annual",
    requesterId: "staff",
    status: "draft",
    title: "Nghỉ phép",
    payload: {},
    fromDate: new Date("2026-12-01T00:00:00.000Z"),
    toDate: new Date("2026-12-01T00:00:00.000Z"),
    quantity: null,
    unit: "day",
    workflowVersionId: null,
    usedDefaultWorkflow: false,
    needsAttention: false,
    round: 0,
    version: 1,
    submittedAt: null,
    decidedAt: null,
    cancelReason: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  db.requests.push({ ...draft });

  const submit = async () => {
    const notices = await engine.submit(client as never, { ...db.requests[0] } as Request, { employeeId: "staff" });
    await engine.dispatch(notices);
    return notices;
  };
  const openStep = () => db.steps.find((step) => step.status === "active")!;
  const request = () => db.requests[0];
  return { engine, db, handler, notifications, submit, openStep, request };
}

describe("ApprovalEngineService", () => {
  it("submits to the matching workflow version and opens the first step", async () => {
    const { db, submit, openStep, request, handler, notifications } = setup();

    await submit();

    expect(request()).toMatchObject({ status: "pending", round: 1, workflowVersionId: "wf-v1", usedDefaultWorkflow: false });
    expect(openStep()).toMatchObject({ nodeId: "manager", name: "Quản lý", round: 1 });
    expect(db.assignees.map((item) => `${item.employeeId}:${item.resolvedFrom}`)).toEqual(["head:direct_manager"]);
    expect(handler.onSubmitted).toHaveBeenCalled();
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ event: "approval.assigned", recipients: { employeeIds: ["head"] } }));
    expect(db.actions.map((item) => item.action)).toEqual(["submit"]);
  });

  it("uses the built-in manager workflow when none matches", async () => {
    const { submit, request, openStep } = setup(null);

    await submit();

    expect(request()).toMatchObject({ usedDefaultWorkflow: true, workflowVersionId: null });
    expect(openStep().nodeId).toBe("manager");
  });

  it("moves through the steps and approves in the same transaction", async () => {
    const { engine, submit, openStep, request, handler, db, notifications } = setup();
    await submit();

    await engine.decide(openStep().id, { employeeId: "head" }, "approve");
    expect(openStep()).toMatchObject({ nodeId: "hr" });
    expect(db.followers.map((item) => item.employeeId)).toEqual(["peer"]);

    await engine.decide(openStep().id, { employeeId: "hr" }, "approve");
    expect(request()).toMatchObject({ status: "approved" });
    expect(request().decidedAt).toBeInstanceOf(Date);
    expect(handler.onApproved).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ event: "request.approved", recipients: { employeeIds: ["staff"] } }));
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ event: "request.approved", recipients: { employeeIds: ["peer"] } }));
  });

  it("refuses someone who is not an assignee", async () => {
    const { engine, submit, openStep } = setup();
    await submit();

    await expect(engine.decide(openStep().id, { employeeId: "peer" }, "approve")).rejects.toThrow(ForbiddenException);
  });

  it("lets only one of two concurrent approvers win", async () => {
    const { engine, submit, openStep, request } = setup();
    await submit();
    const stepId = openStep().id;
    const seenVersion = request().version;

    await engine.decide(stepId, { employeeId: "head" }, "approve", undefined, seenVersion);
    await expect(engine.decide(stepId, { employeeId: "head" }, "approve", undefined, seenVersion)).rejects.toThrow(ConflictException);
  });

  it("waits for everyone on an 'all' step", async () => {
    const flow: FlowDefinition = {
      nodes: [
        { id: "start", type: "start" },
        { id: "board", type: "approval", approvalConfig: { name: "Ban giám đốc", approverId: "ceo, hr", approvalMode: "all" } },
        { id: "ok", type: "approved" }
      ],
      edges: [
        { source: "start", target: "board" },
        { source: "board", target: "ok" }
      ]
    };
    const { engine, submit, openStep, request } = setup(flow);
    await submit();
    const stepId = openStep().id;

    await engine.decide(stepId, { employeeId: "ceo" }, "approve");
    expect(request().status).toBe("pending");
    await engine.decide(stepId, { employeeId: "hr" }, "approve");
    expect(request().status).toBe("approved");
  });

  it("closes an 'any' step on the first decision", async () => {
    const flow: FlowDefinition = {
      nodes: [
        { id: "start", type: "start" },
        { id: "board", type: "approval", approvalConfig: { name: "Ban giám đốc", approverId: "ceo, hr" } },
        { id: "ok", type: "approved" }
      ],
      edges: [
        { source: "start", target: "board" },
        { source: "board", target: "ok" }
      ]
    };
    const { engine, submit, openStep, request, db } = setup(flow);
    await submit();

    await engine.decide(openStep().id, { employeeId: "hr" }, "approve");
    expect(request().status).toBe("approved");
    expect(db.assignees.find((item) => item.employeeId === "ceo")?.status).toBe("superseded");
  });

  it("rejects with a reason and releases what the request held", async () => {
    const { engine, submit, openStep, request, handler, notifications } = setup();
    await submit();

    await expect(engine.decide(openStep().id, { employeeId: "head" }, "reject")).rejects.toThrow(BadRequestException);
    await engine.decide(openStep().id, { employeeId: "head" }, "reject", "Trùng lịch dự án");

    expect(request().status).toBe("rejected");
    expect(handler.onWithdrawn).toHaveBeenCalled();
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ event: "request.rejected", body: "Trùng lịch dự án" }));
  });

  it("returns a request, which restarts from the first step when resubmitted", async () => {
    const { engine, submit, openStep, request, db } = setup();
    await submit();
    await engine.decide(openStep().id, { employeeId: "head" }, "approve");
    await engine.decide(openStep().id, { employeeId: "hr" }, "return", "Thiếu giấy tờ");
    expect(request().status).toBe("returned");

    await submit();
    expect(request()).toMatchObject({ status: "pending", round: 2 });
    expect(openStep()).toMatchObject({ nodeId: "manager", round: 2 });
    expect(db.actions.map((item) => item.action)).toContain("resubmit");
  });

  it("lets the requester recall until someone acts on the current step", async () => {
    const { engine, submit, openStep, request, handler } = setup();
    await submit();

    await expect(engine.recall("req-1", { employeeId: "peer" })).rejects.toThrow(ForbiddenException);
    await engine.recall("req-1", { employeeId: "staff" });
    expect(request().status).toBe("draft");
    expect(handler.onWithdrawn).toHaveBeenCalled();

    await submit();
    await engine.decide(openStep().id, { employeeId: "head" }, "approve");
    const flowAll = openStep();
    expect(flowAll.nodeId).toBe("hr");
    await engine.recall("req-1", { employeeId: "staff" });
    expect(request().status).toBe("draft");
  });

  it("only lets HR cancel an approved request, with a reason, and undoes its effects", async () => {
    const { engine, submit, openStep, request, handler } = setup();
    await submit();
    await engine.decide(openStep().id, { employeeId: "head" }, "approve");
    await engine.decide(openStep().id, { employeeId: "hr" }, "approve");

    await expect(engine.cancel("req-1", { employeeId: "staff" }, "Đổi kế hoạch", false)).rejects.toThrow(ForbiddenException);
    await expect(engine.cancel("req-1", { employeeId: "hr" }, "", true)).rejects.toThrow(BadRequestException);
    await engine.cancel("req-1", { employeeId: "hr" }, "Nhân viên đi làm lại", true);

    expect(request()).toMatchObject({ status: "cancelled", cancelReason: "Nhân viên đi làm lại" });
    expect(handler.onCancelledAfterApproval).toHaveBeenCalled();
  });

  it("will not approve into a locked attendance month", async () => {
    const { engine, submit, openStep, request, db } = setup();
    await submit();
    await engine.decide(openStep().id, { employeeId: "head" }, "approve");
    db.periods.push({ month: "2026-12", status: "locked" });

    await expect(engine.decide(openStep().id, { employeeId: "hr" }, "approve")).rejects.toThrow("2026-12");
    expect(request().status).toBe("pending");
  });

  it("records an error when nobody at all can approve a step", async () => {
    const flow: FlowDefinition = {
      nodes: [
        { id: "start", type: "start" },
        { id: "nobody", type: "approval", approvalConfig: { name: "Phòng trống", approverId: "department:missing" } },
        { id: "ok", type: "approved" }
      ],
      edges: [
        { source: "start", target: "nobody" },
        { source: "nobody", target: "ok" }
      ]
    };
    const { submit, db, request, engine } = setup(flow);
    (engine as unknown as { org: { fallbackAdminIds: () => Promise<string[]> } }).org.fallbackAdminIds = async () => [];
    await submit();

    expect(request()).toMatchObject({ status: "pending", needsAttention: true });
    expect(db.actions.find((item) => item.action === "error")?.reason).toContain("Không tìm được người duyệt");
  });

  it("skips a step that would go to the requester and flags admin fallbacks", async () => {
    const flow: FlowDefinition = {
      nodes: [
        { id: "start", type: "start" },
        { id: "self", type: "approval", approvalConfig: { name: "Tự duyệt", approverId: "staff" } },
        { id: "nobody", type: "approval", approvalConfig: { name: "Phòng trống", approverId: "department:missing" } },
        { id: "ok", type: "approved" }
      ],
      edges: [
        { source: "start", target: "self" },
        { source: "self", target: "nobody" },
        { source: "nobody", target: "ok" }
      ]
    };
    const { submit, db, request, openStep } = setup(flow);
    await submit();

    expect(db.steps.map((step) => `${step.nodeId}:${step.status}`)).toEqual(["self:skipped", "nobody:active"]);
    expect(db.assignees.map((item) => `${item.employeeId}:${item.resolvedFrom}`)).toEqual(["admin:fallback_admin"]);
    expect(request().needsAttention).toBe(true);
    expect(openStep().nodeId).toBe("nobody");
  });
});
