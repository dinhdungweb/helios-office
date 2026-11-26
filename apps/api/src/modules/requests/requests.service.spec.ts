import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { RequestTypeRegistry } from "../approvals/engine/request-types";
import { RequestsService } from "./requests.service";

const user = (employeeId: string | null, extra: Record<string, unknown> = {}): AuthenticatedUser =>
  ({ sub: "s", roles: [], claims: {}, account: { id: `acc-${employeeId}`, employeeId, adminRole: "user", ...extra } }) as never;

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: "req-1",
  code: "NP-2026-000001",
  type: "leave",
  subType: "annual",
  requesterId: "staff",
  status: "draft",
  title: "Nghỉ phép",
  payload: {},
  fromDate: null,
  toDate: null,
  quantity: null,
  unit: "day",
  workflowVersionId: null,
  workflowVersion: null,
  usedDefaultWorkflow: false,
  needsAttention: false,
  round: 0,
  version: 1,
  submittedAt: null,
  decidedAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  requester: { id: "staff", fullName: "Nhân viên" },
  steps: [],
  followers: [],
  ...overrides
});

function setup(options: { grants?: string[]; request?: Record<string, unknown> } = {}) {
  const request = stored(options.request);
  const tx = {
    request: {
      create: jest.fn(async ({ data }) => ({ ...stored(), ...data, id: "req-new" })),
      findUnique: jest.fn().mockResolvedValue(request),
      updateMany: jest.fn().mockResolvedValue({ count: 1 })
    },
    requestFollower: { createMany: jest.fn(), deleteMany: jest.fn() },
    employee: { count: jest.fn(async ({ where }) => where.id.in.length) },
    approvalAction: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([{ value: BigInt(42) }])
  };
  const prisma = {
    ...tx,
    request: { ...tx.request, findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    approvalAssignee: { count: jest.fn().mockResolvedValue(0) },
    requestFollower: { ...tx.requestFollower, count: jest.fn().mockResolvedValue(0) },
    employee: { ...tx.employee, findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ departmentId: "sales" }) },
    $transaction: jest.fn(async (run: (client: typeof tx) => unknown) => run(tx))
  };
  const dataScope = {
    grantsFor: jest.fn(async (_id: string, keys: string[]) => keys.filter((key) => options.grants?.includes(key)).map((key) => ({ key }))),
    resolve: jest.fn().mockResolvedValue({ level: "department", departmentIds: ["sales"], employeeIds: ["hr"] }),
    employeeWhere: jest.fn().mockReturnValue({ departmentId: { in: ["sales"] } })
  };
  const engine = { submit: jest.fn().mockResolvedValue([]), dispatch: jest.fn(), recall: jest.fn(), cancel: jest.fn(), decide: jest.fn().mockResolvedValue(request) };
  const registry = new RequestTypeRegistry();
  const handler = {
    type: "leave",
    prepare: jest.fn(async (payload: unknown) => ({ payload, summary: { title: "Nghỉ phép năm", subType: "annual", quantity: 1, unit: "day" } })),
    conditionFields: () => [{ key: "total_days", label: "Số ngày", kind: "number" }],
    conditionRecord: () => ({})
  };
  registry.register(handler as never);
  const service = new RequestsService(prisma as never, { contextFields: () => ({}) } as never, dataScope as never, engine as never, registry);
  return { service, prisma, tx, engine, handler, dataScope };
}

describe("RequestsService", () => {
  it("creates a draft with a numbered code and the handler's summary", async () => {
    const { service, tx, engine } = setup();

    await service.create(user("staff"), { type: "leave", payload: { a: 1 }, followerIds: ["peer", "staff"] });

    expect(tx.request.create.mock.calls[0][0].data).toMatchObject({
      code: expect.stringMatching(/^NP-\d{4}-000042$/),
      status: "draft",
      title: "Nghỉ phép năm",
      subType: "annual",
      requesterId: "staff"
    });
    expect(tx.requestFollower.createMany.mock.calls[0][0].data).toEqual([{ requestId: "req-new", employeeId: "peer", source: "requester_choice" }]);
    expect(engine.submit).not.toHaveBeenCalled();
  });

  it("submits in the same transaction when asked", async () => {
    const { service, engine } = setup();

    await service.create(user("staff"), { type: "leave", payload: {}, submit: true });
    expect(engine.submit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: "req-new" }), { employeeId: "staff", accountId: "acc-staff" });
  });

  it("refuses request types without a handler yet", async () => {
    const { service } = setup();
    await expect(service.create(user("staff"), { type: "overtime", payload: {} })).rejects.toThrow(BadRequestException);
  });

  it("needs an employee profile", async () => {
    const { service } = setup();
    await expect(service.create(user(null), { type: "leave", payload: {} })).rejects.toThrow(ForbiddenException);
  });

  it("lets only the requester edit, and only drafts or returned requests", async () => {
    const { service } = setup({ request: { status: "pending" } });
    await expect(service.update(user("peer"), "req-1", { payload: {} })).rejects.toThrow(ForbiddenException);
    await expect(service.update(user("staff"), "req-1", { payload: {} })).rejects.toThrow(ConflictException);
  });

  it("refuses an edit based on an old version", async () => {
    const { service } = setup();
    await expect(service.update(user("staff"), "req-1", { payload: {}, version: 7 })).rejects.toThrow(ConflictException);
  });

  it("hides someone else's request from an uninvolved colleague", async () => {
    const { service, prisma } = setup({ request: { status: "pending" } });
    prisma.request.findUnique.mockResolvedValue(stored({ status: "pending" }));
    await expect(service.detail(user("peer"), "req-1")).rejects.toThrow(NotFoundException);
  });

  it("shows a request to an assignee and to HR in scope", async () => {
    const assigned = setup({ request: { status: "pending" } });
    assigned.prisma.approvalAssignee.count.mockResolvedValue(1);
    await expect(assigned.service.detail(user("head"), "req-1")).resolves.toMatchObject({ code: "NP-2026-000001" });

    const hr = setup({ grants: ["permission.requests.view"], request: { status: "pending" } });
    await expect(hr.service.detail(user("hr"), "req-1")).resolves.toMatchObject({ permissions: { canEdit: false } });
  });

  it("keeps drafts private even from HR", async () => {
    const { service } = setup({ grants: ["permission.requests.view"] });
    await expect(service.detail(user("hr"), "req-1")).rejects.toThrow(NotFoundException);
  });

  it("lists the HR box only with permission, limited to the data scope", async () => {
    const without = setup();
    await expect(without.service.list(user("staff"), { box: "all" })).rejects.toThrow(ForbiddenException);

    const withGrant = setup({ grants: ["permission.requests.view"] });
    await withGrant.service.list(user("hr"), { box: "all" });
    expect(JSON.stringify(withGrant.prisma.request.findMany.mock.calls[0][0].where)).toContain("sales");
  });

  it("filters the approver box to open steps assigned to me", async () => {
    const { service, prisma } = setup();
    await service.list(user("head"), { box: "to_approve" });
    expect(prisma.request.findMany.mock.calls[0][0].where.AND[0]).toEqual({
      status: "pending",
      steps: { some: { status: "active", assignees: { some: { employeeId: "head", status: "pending" } } } }
    });
  });

  it("gives an empty personal box to an account without a profile", async () => {
    const { service } = setup();
    await expect(service.list(user(null), { box: "mine" })).resolves.toMatchObject({ items: [], total: 0 });
  });

  it("passes HR's manage permission to the engine when cancelling", async () => {
    const { service, engine } = setup({ grants: ["permission.requests.manage"], request: { status: "approved" } });
    await service.cancel(user("hr"), "req-1", "Đi làm lại").catch(() => undefined);
    expect(engine.cancel).toHaveBeenCalledWith("req-1", expect.objectContaining({ employeeId: "hr" }), "Đi làm lại", true);
  });

  it("lists creatable types with their condition fields", () => {
    const { service } = setup();
    expect(service.types()).toEqual([{ type: "leave", label: "Đơn xin nghỉ", conditionFields: [{ key: "total_days", label: "Số ngày", kind: "number" }] }]);
  });
});
