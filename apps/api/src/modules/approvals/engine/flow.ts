import { sanitizeRichText } from "../../../common/html/sanitize-html";

// The workflow diagram saved by the 1Office-style designer (docs/design/approval-engine.md §5.2).
// Pure: parsing and validation only, no database.

export const FLOW_NODE_TYPES = ["start", "approval", "condition", "notification", "email", "approved", "rejected"] as const;
export type FlowNodeType = (typeof FLOW_NODE_TYPES)[number];

export type ConditionOperator = "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than";
export type ConditionFunction = "" | "round" | "month" | "year";

export type ConditionClause = {
  id: string;
  leftFunction?: ConditionFunction;
  field: string;
  operator: ConditionOperator | "";
  rightType: "field" | "value";
  rightValue: string;
};

export type ConditionGroup = { id: string; clauses: ConditionClause[] };
export type ConditionConfig = { name: string; groups: ConditionGroup[] };
export type ConditionSlot = { id: string; config?: ConditionConfig };

export type OverdueAction = "auto_approve" | "auto_reject" | "substitute" | "none";

export type ApprovalNodeConfig = {
  name: string;
  code?: string;
  approverId: string;
  followerId?: string;
  substituteId?: string;
  deadlineDays?: string;
  deadlineHours?: string;
  deadlineMinutes?: string;
  overdueAction?: OverdueAction;
  // Added by the engine design; older diagrams leave them out and get the defaults.
  approvalMode?: "any" | "all";
  selfApproval?: "skip" | "allow";
  allowReturn?: boolean;
  allowForward?: boolean;
};

export type NotificationNodeConfig = { title: string; recipientId: string; content: string };
export type EmailNodeConfig = {
  title: string;
  objectType?: string;
  senderId?: string;
  subject: string;
  recipientId: string;
  ccId?: string;
  bccId?: string;
  content: string;
  attachmentNames?: string[];
};

export type FlowNode = {
  id: string;
  type: FlowNodeType;
  label?: string;
  x?: number;
  y?: number;
  approvalConfig?: ApprovalNodeConfig;
  notificationConfig?: NotificationNodeConfig;
  emailConfig?: EmailNodeConfig;
  conditionConfig?: ConditionConfig;
  conditionSlots?: ConditionSlot[];
};

export type FlowEdge = { id?: string; source: string; target: string; branch?: string };

export type FlowDefinition = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  startNodePosition?: { x: number; y: number };
  edgeStyle?: string;
};

const TERMINAL_TYPES: ReadonlySet<FlowNodeType> = new Set(["approved", "rejected"]);

export function isTerminal(node: FlowNode) {
  return TERMINAL_TYPES.has(node.type);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Reads a stored diagram, dropping anything that is not a node or an edge. Never throws:
// validateFlow reports what is missing.
export function parseFlow(value: unknown): FlowDefinition {
  const source = isObject(value) ? value : {};
  const nodes = Array.isArray(source.nodes) ? source.nodes : [];
  const edges = Array.isArray(source.edges) ? source.edges : [];

  return {
    ...source,
    nodes: nodes.filter(
      (node): node is FlowNode =>
        isObject(node) && typeof node.id === "string" && (FLOW_NODE_TYPES as readonly string[]).includes(node.type as string)
    ),
    edges: edges.filter(
      (edge): edge is FlowEdge => isObject(edge) && typeof edge.source === "string" && typeof edge.target === "string"
    )
  };
}

// The ordered condition slots of a condition node. Older diagrams keep a single conditionConfig.
export function conditionSlots(node: FlowNode): ConditionSlot[] {
  if (node.conditionSlots?.length) return node.conditionSlots;
  return [{ id: `${node.id}:condition-1`, config: node.conditionConfig }];
}

export function outgoing(flow: FlowDefinition, nodeId: string) {
  return flow.edges.filter((edge) => edge.source === nodeId);
}

// Splits "1,2, 3" or "1" into ids; the designer stores one value today but the engine accepts lists.
export function splitAudience(value: string | undefined | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// Errors that stop a workflow from being activated (§5.2). Empty = valid.
export function validateFlow(flow: FlowDefinition): string[] {
  const errors: string[] = [];
  const byId = new Map(flow.nodes.map((node) => [node.id, node]));
  const label = (node: FlowNode) => `"${node.approvalConfig?.name || node.conditionConfig?.name || node.label || node.id}"`;

  if (byId.size !== flow.nodes.length) errors.push("Sơ đồ có hai node trùng mã.");

  const starts = flow.nodes.filter((node) => node.type === "start");
  if (starts.length !== 1) {
    errors.push("Sơ đồ phải có đúng một điểm bắt đầu.");
    return errors;
  }
  if (!flow.nodes.some(isTerminal)) errors.push("Sơ đồ chưa có node Đã duyệt hoặc Không duyệt.");

  for (const edge of flow.edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) errors.push("Có đường nối tới node không tồn tại.");
    if (byId.get(edge.target)?.type === "start") errors.push("Không được nối vào điểm bắt đầu.");
  }

  for (const node of flow.nodes) {
    const out = outgoing(flow, node.id);

    if (isTerminal(node)) {
      if (out.length > 0) errors.push(`Node kết thúc ${label(node)} không được có đường đi tiếp.`);
      continue;
    }
    if (out.length === 0) {
      errors.push(`Node ${label(node)} chưa nối tới bước tiếp theo.`);
      continue;
    }

    if (node.type === "condition") {
      const slotIds = new Set(conditionSlots(node).map((slot) => slot.id));
      const fallsThrough =
        out.some((edge) => edge.branch === "unmatched") ||
        out.some((edge) => edge.branch?.startsWith("unmatched:") && slotIds.has(edge.branch.slice("unmatched:".length)));
      if (!fallsThrough) errors.push(`Điều kiện ${label(node)} chưa có nhánh "Không thỏa mãn".`);
      for (const slot of conditionSlots(node)) {
        const hasClause = slot.config?.groups.some((group) => group.clauses.some((clause) => clause.field && clause.operator));
        if (!hasClause) errors.push(`Điều kiện ${label(node)} có ô chưa cài đặt.`);
      }
    } else if (out.length > 1) {
      errors.push(`Node ${label(node)} chỉ được có một đường đi tiếp (chưa hỗ trợ nhánh song song).`);
    }

    if (node.type === "approval" && splitAudience(node.approvalConfig?.approverId).length === 0) {
      errors.push(`Bước duyệt ${label(node)} chưa chọn người duyệt.`);
    }
  }

  // Reachability and cycles, walking from the start.
  const visited = new Set<string>();
  const onPath = new Set<string>();
  let cycle = false;
  const visit = (id: string) => {
    if (onPath.has(id)) {
      cycle = true;
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    onPath.add(id);
    for (const edge of outgoing(flow, id)) if (byId.has(edge.target)) visit(edge.target);
    onPath.delete(id);
  };
  visit(starts[0].id);

  if (cycle) errors.push("Sơ đồ có vòng lặp.");
  for (const node of flow.nodes) {
    if (!visited.has(node.id)) errors.push(`Node ${label(node)} không nối từ điểm bắt đầu.`);
  }

  return [...new Set(errors)];
}

// The built-in workflow used when no active workflow matches a request (§5.1): the requester's
// direct manager approves.
export function defaultFlow(): FlowDefinition {
  return {
    nodes: [
      { id: "start", type: "start", label: "Bắt đầu" },
      {
        id: "manager",
        type: "approval",
        label: "Quản lý trực tiếp",
        approvalConfig: { name: "Quản lý trực tiếp", approverId: "automatic:direct_manager", approvalMode: "any", selfApproval: "skip" }
      },
      { id: "approved", type: "approved", label: "Đã duyệt" }
    ],
    edges: [
      { source: "start", target: "manager", branch: "default" },
      { source: "manager", target: "approved", branch: "default" }
    ]
  };
}

// AP-25: notification / email content is cleaned on the server before it is stored (and again
// before it is sent), whatever the browser did.
export function sanitizeFlow(flow: FlowDefinition): FlowDefinition {
  return {
    ...flow,
    nodes: flow.nodes.map((node) => ({
      ...node,
      ...(node.notificationConfig ? { notificationConfig: { ...node.notificationConfig, content: sanitizeRichText(node.notificationConfig.content) } } : {}),
      ...(node.emailConfig ? { emailConfig: { ...node.emailConfig, content: sanitizeRichText(node.emailConfig.content) } } : {})
    }))
  };
}
