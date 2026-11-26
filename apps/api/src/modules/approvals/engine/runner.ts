import type { ResolveResult } from "./approvers";
import { evaluateCondition, type ConditionRecord } from "./conditions";
import { conditionSlots, outgoing, type FlowDefinition, type FlowNode } from "./flow";

// Walks a workflow diagram from a node until it reaches an approval step that needs people or an
// end node (docs/design/approval-engine.md §5.3). Pure: approver resolution is passed in.

export const MAX_STEPS = 100;

export type RunContext = {
  record: ConditionRecord;
  resolve: (node: FlowNode, isLastApproval: boolean) => ResolveResult;
};

export type RunEvent = { kind: "notify"; node: FlowNode } | { kind: "skipped"; node: FlowNode };

export type RunOutcome =
  | { kind: "step"; node: FlowNode; resolved: ResolveResult }
  | { kind: "approved"; node: FlowNode }
  | { kind: "rejected"; node: FlowNode }
  | { kind: "error"; message: string };

export type RunResult = { events: RunEvent[]; outcome: RunOutcome };

// The node a condition sends the request to: the first true slot's "matched" branch; a false slot's
// own "unmatched" branch if it has one; otherwise the node's "unmatched" branch.
function conditionTarget(flow: FlowDefinition, node: FlowNode, record: ConditionRecord): string | null {
  const edges = outgoing(flow, node.id);
  const slots = conditionSlots(node);

  for (const [index, slot] of slots.entries()) {
    if (evaluateCondition(slot.config, record)) {
      const edge = edges.find((item) => item.branch === `matched:${slot.id}`) ?? (index === 0 ? edges.find((item) => item.branch === "matched") : undefined);
      if (edge) return edge.target;
      continue;
    }
    const own = edges.find((item) => item.branch === `unmatched:${slot.id}`);
    if (own) return own.target;
  }

  return edges.find((item) => item.branch === "unmatched")?.target ?? null;
}

function nextNodeId(flow: FlowDefinition, node: FlowNode, record: ConditionRecord): string | null {
  if (node.type === "condition") return conditionTarget(flow, node, record);
  return outgoing(flow, node.id)[0]?.target ?? null;
}

// Whether any approval step can still follow this node.
export function hasLaterApproval(flow: FlowDefinition, nodeId: string): boolean {
  const byId = new Map(flow.nodes.map((node) => [node.id, node]));
  const seen = new Set<string>([nodeId]);
  const queue = outgoing(flow, nodeId).map((edge) => edge.target);
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (!node) continue;
    if (node.type === "approval") return true;
    queue.push(...outgoing(flow, id).map((edge) => edge.target));
  }
  return false;
}

// Runs from the node after `fromNodeId` (the start node, or an approval step just completed).
export function runFrom(flow: FlowDefinition, fromNodeId: string, context: RunContext): RunResult {
  const byId = new Map(flow.nodes.map((node) => [node.id, node]));
  const events: RunEvent[] = [];
  let current = byId.get(fromNodeId);
  if (!current) return { events, outcome: { kind: "error", message: `Không tìm thấy node ${fromNodeId} trong quy trình.` } };

  for (let count = 0; count < MAX_STEPS; count++) {
    const targetId = nextNodeId(flow, current, context.record);
    const next = targetId ? byId.get(targetId) : undefined;
    if (!next) {
      return { events, outcome: { kind: "error", message: `Quy trình dừng ở node "${current.label ?? current.id}": không có bước tiếp theo phù hợp.` } };
    }
    current = next;

    switch (current.type) {
      case "approved":
        return { events, outcome: { kind: "approved", node: current } };
      case "rejected":
        return { events, outcome: { kind: "rejected", node: current } };
      case "notification":
      case "email":
        events.push({ kind: "notify", node: current });
        break;
      case "approval": {
        const resolved = context.resolve(current, !hasLaterApproval(flow, current.id));
        if (resolved.skip) {
          events.push({ kind: "skipped", node: current });
          break;
        }
        return { events, outcome: { kind: "step", node: current, resolved } };
      }
      default:
        // condition / start: just move on.
        break;
    }
  }

  return { events, outcome: { kind: "error", message: `Quy trình vượt quá ${MAX_STEPS} bước, có thể sơ đồ bị lặp.` } };
}

export type WorkflowCandidate = { id: string; objectType: string; subObject: string; status: string; updatedAt: Date };

// §5.1: active workflows of the request type; an exact sub-type beats "all", then the most recently updated.
export function pickWorkflow<T extends WorkflowCandidate>(candidates: T[], type: string, subType: string | null | undefined): T | null {
  const matching = candidates.filter(
    (item) => item.status === "active" && item.objectType === type && (item.subObject === "all" || !item.subObject || (subType && item.subObject === subType))
  );
  matching.sort((left, right) => {
    const leftExact = subType && left.subObject === subType ? 1 : 0;
    const rightExact = subType && right.subObject === subType ? 1 : 0;
    return rightExact - leftExact || right.updatedAt.getTime() - left.updatedAt.getTime();
  });
  return matching[0] ?? null;
}
