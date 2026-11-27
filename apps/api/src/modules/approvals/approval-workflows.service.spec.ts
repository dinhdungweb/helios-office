import { BadRequestException, ConflictException } from "@nestjs/common";
import { ApprovalWorkflowsService } from "./approval-workflows.service";
import type { CreateApprovalWorkflowDto } from "./approval-workflows.dto";

const validFlow = {
  nodes: [
    { id: "start", type: "start" },
    { id: "a", type: "approval", approvalConfig: { name: "Quản lý", approverId: "automatic:direct_manager" } },
    { id: "ok", type: "approved" },
    { id: "n", type: "notification", notificationConfig: { title: "t", recipientId: "x", content: "<p onclick=x>Hi</p><script>bad()</script>" } }
  ],
  edges: [
    { source: "start", target: "a" },
    { source: "a", target: "n" },
    { source: "n", target: "ok" }
  ]
};
const brokenFlow = { nodes: [{ id: "start", type: "start" }], edges: [] };

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: "wf-1",
  code: null,
  name: "Nghỉ phép",
  status: "active",
  objectType: "leave",
  subObject: "all",
  versionMode: true,
  approvalType: "workflow",
  followerId: null,
  showFlowInObject: false,
  allowAttachmentsAfterApproved: false,
  allowDocumentChangesAfterApproved: false,
  allowDiscussionAfterApproved: true,
  overdueAction: "none",
  flowDefinition: validFlow,
  currentVersion: 1,
  ...overrides
});

function setup(existing = stored()) {
  const tx = {
    approvalWorkflowDefinition: {
      create: jest.fn(async ({ data }) => stored({ ...data, id: "wf-new" })),
      update: jest.fn(async ({ data }) =>
        stored({ ...existing, ...data, currentVersion: data.currentVersion ? existing.currentVersion + 1 : existing.currentVersion })
      ),
      delete: jest.fn()
    },
    approvalWorkflowVersion: { create: jest.fn() },
    auditLog: { create: jest.fn() }
  };
  const prisma = {
    ...tx,
    approvalWorkflowDefinition: { ...tx.approvalWorkflowDefinition, findUnique: jest.fn().mockResolvedValue(existing), findMany: jest.fn() },
    approvalWorkflowVersion: { ...tx.approvalWorkflowVersion, findMany: jest.fn().mockResolvedValue([]) },
    request: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn(async (run: (client: typeof tx) => unknown) => run(tx))
  };
  const service = new ApprovalWorkflowsService(prisma as never, { contextFields: () => ({}) } as never);
  return { service, prisma, tx };
}

const dto = (overrides: Partial<CreateApprovalWorkflowDto> = {}): CreateApprovalWorkflowDto => ({
  name: "Nghỉ phép",
  status: "active",
  objectType: "leave",
  flowDefinition: validFlow,
  ...overrides
});

describe("ApprovalWorkflowsService", () => {
  it("creates a workflow with version 1 and cleans node HTML on the server (AP-25)", async () => {
    const { service, tx } = setup();

    await service.create(dto(), "emp-hr");

    const savedFlow = tx.approvalWorkflowDefinition.create.mock.calls[0][0].data.flowDefinition;
    expect(savedFlow.nodes.find((node: { id: string }) => node.id === "n").notificationConfig.content).toBe("<p>Hi</p>");
    expect(tx.approvalWorkflowVersion.create.mock.calls[0][0].data).toMatchObject({ workflowId: "wf-new", version: 1, flowDefinition: savedFlow });
    expect(tx.auditLog.create.mock.calls[0][0].data.action).toBe("approval_workflow.create");
  });

  it("refuses to create an active workflow whose diagram is invalid", async () => {
    const { service, tx } = setup();

    await expect(service.create(dto({ flowDefinition: brokenFlow }))).rejects.toThrow(BadRequestException);
    expect(tx.approvalWorkflowDefinition.create).not.toHaveBeenCalled();
  });

  it("lets a draft keep an unfinished diagram", async () => {
    const { service, tx } = setup();

    await service.create(dto({ status: "draft", flowDefinition: brokenFlow }));
    expect(tx.approvalWorkflowDefinition.create).toHaveBeenCalled();
  });

  it("makes a new version when the diagram changes (AP-04, AP-06)", async () => {
    const { service, tx } = setup();

    await service.update("wf-1", { flowDefinition: validFlow }, "emp-hr");

    expect(tx.approvalWorkflowDefinition.update.mock.calls[0][0].data.currentVersion).toEqual({ increment: 1 });
    expect(tx.approvalWorkflowVersion.create.mock.calls[0][0].data).toMatchObject({ workflowId: "wf-1", version: 2 });
  });

  it("does not version a rename", async () => {
    const { service, tx } = setup();

    await service.update("wf-1", { name: "Nghỉ phép năm" });

    expect(tx.approvalWorkflowDefinition.update.mock.calls[0][0].data.currentVersion).toBeUndefined();
    expect(tx.approvalWorkflowVersion.create).not.toHaveBeenCalled();
  });

  it("checks the stored diagram before activating (AP-08)", async () => {
    const { service } = setup(stored({ status: "draft", flowDefinition: brokenFlow }));

    await expect(service.activate("wf-1")).rejects.toMatchObject({ response: { errors: expect.arrayContaining([expect.stringContaining("Đã duyệt")]) } });
  });

  it("deactivates to archived (Tạm dừng)", async () => {
    const { service, tx } = setup();

    await service.deactivate("wf-1");
    expect(tx.approvalWorkflowDefinition.update.mock.calls[0][0].data.status).toBe("archived");
  });

  it("duplicates as an inactive copy (AP-07)", async () => {
    const { service, tx } = setup();

    await service.duplicate("wf-1");
    expect(tx.approvalWorkflowDefinition.create.mock.calls[0][0].data).toMatchObject({ name: "Nghỉ phép (bản sao)", status: "draft", code: null, currentVersion: 1 });
  });

  it("refuses to delete a workflow that requests used", async () => {
    const { service, prisma, tx } = setup();
    prisma.request.count.mockResolvedValue(2);

    await expect(service.delete("wf-1")).rejects.toThrow(ConflictException);
    expect(tx.approvalWorkflowDefinition.delete).not.toHaveBeenCalled();
  });

  it("reports what blocks activation on the detail view (AP-05)", async () => {
    const { service } = setup(stored({ flowDefinition: brokenFlow }));

    const detail = await service.findOne("wf-1");
    expect(detail.validationErrors.length).toBeGreaterThan(0);
  });
});
