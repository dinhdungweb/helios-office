import type { ResolveResult } from "./approvers";
import type { FlowDefinition, FlowNode } from "./flow";
import { hasLaterApproval, pickWorkflow, runFrom, type RunContext } from "./runner";

const approval = (id: string): FlowNode => ({ id, type: "approval", label: id, approvalConfig: { name: id, approverId: id } });
const node = (id: string, type: FlowNode["type"]): FlowNode => ({ id, type, label: id });
const daysOver = (id: string, days: string, slotIds = [`${id}:s1`]): FlowNode => ({
  id,
  type: "condition",
  conditionSlots: slotIds.map((slotId, index) => ({
    id: slotId,
    config: { name: id, groups: [{ id: "g", clauses: [{ id: "c", field: "total_days", operator: "greater_than", rightType: "value", rightValue: index === 0 ? days : String(Number(days) * 2) }] }] }
  }))
});
const edge = (source: string, target: string, branch = "default") => ({ source, target, branch });

const someone: ResolveResult = { assignees: [{ employeeId: "x", resolvedFrom: "employee" }], skip: false, needsAttention: false };
const nobody: ResolveResult = { assignees: [], skip: true, needsAttention: false };

function context(record: Record<string, unknown> = {}, skipIds: string[] = []): RunContext & { calls: Array<[string, boolean]> } {
  const calls: Array<[string, boolean]> = [];
  return {
    record,
    calls,
    resolve: (target, isLast) => {
      calls.push([target.id, isLast]);
      return skipIds.includes(target.id) ? nobody : someone;
    }
  };
}

const chain: FlowDefinition = {
  nodes: [node("start", "start"), approval("manager"), node("notice", "notification"), approval("director"), node("ok", "approved")],
  edges: [edge("start", "manager"), edge("manager", "notice"), edge("notice", "director"), edge("director", "ok")]
};

// start → condition: > 3 days → director, otherwise → manager.
const branching: FlowDefinition = {
  nodes: [node("start", "start"), daysOver("c", "3"), approval("director"), approval("manager"), node("ok", "approved")],
  edges: [edge("start", "c"), edge("c", "director", "matched:c:s1"), edge("c", "manager", "unmatched"), edge("director", "ok"), edge("manager", "ok")]
};

describe("runFrom", () => {
  it("stops at the first approval step", () => {
    const result = runFrom(chain, "start", context());
    expect(result.outcome).toMatchObject({ kind: "step", node: { id: "manager" } });
    expect(result.events).toEqual([]);
  });

  it("passes notification nodes and stops at the next step", () => {
    const result = runFrom(chain, "manager", context());
    expect(result.events.map((event) => `${event.kind}:${event.node.id}`)).toEqual(["notify:notice"]);
    expect(result.outcome).toMatchObject({ kind: "step", node: { id: "director" } });
  });

  it("reaches approved after the last step", () => {
    expect(runFrom(chain, "director", context()).outcome).toMatchObject({ kind: "approved" });
  });

  it("tells the resolver which step is the last approval", () => {
    const ctx = context();
    runFrom(chain, "start", ctx);
    runFrom(chain, "manager", ctx);
    expect(ctx.calls).toEqual([["manager", false], ["director", true]]);
  });

  it("skips a step with nobody but the requester and goes on", () => {
    const result = runFrom(chain, "start", context({}, ["manager"]));
    expect(result.events.map((event) => `${event.kind}:${event.node.id}`)).toEqual(["skipped:manager", "notify:notice"]);
    expect(result.outcome).toMatchObject({ kind: "step", node: { id: "director" } });
  });

  it("approves when every step is skipped", () => {
    expect(runFrom(chain, "start", context({}, ["manager", "director"])).outcome).toMatchObject({ kind: "approved" });
  });

  it.each([
    [5, "director"],
    [2, "manager"],
    [undefined, "manager"]
  ])("follows the condition branch for %s days", (days, expected) => {
    expect(runFrom(branching, "start", context({ total_days: days })).outcome).toMatchObject({ kind: "step", node: { id: expected } });
  });

  it("takes the first true slot of a multi-slot condition", () => {
    const flow: FlowDefinition = {
      nodes: [node("start", "start"), daysOver("c", "3", ["c:a", "c:b"]), approval("ceo"), approval("director"), approval("manager"), node("ok", "approved")],
      edges: [
        edge("start", "c"),
        edge("c", "director", "matched:c:a"),
        edge("c", "ceo", "matched:c:b"),
        edge("c", "manager", "unmatched"),
        edge("ceo", "ok"),
        edge("director", "ok"),
        edge("manager", "ok")
      ]
    };
    expect(runFrom(flow, "start", context({ total_days: 10 })).outcome).toMatchObject({ node: { id: "director" } });
  });

  it("uses a false slot's own unmatched branch", () => {
    const flow: FlowDefinition = {
      nodes: [node("start", "start"), daysOver("c", "3"), node("ok", "approved"), node("no", "rejected")],
      edges: [edge("start", "c"), edge("c", "ok", "matched:c:s1"), edge("c", "no", "unmatched:c:s1")]
    };
    expect(runFrom(flow, "start", context({ total_days: 1 })).outcome).toMatchObject({ kind: "rejected" });
  });

  it("reports a diagram with nowhere to go", () => {
    const flow: FlowDefinition = { nodes: [node("start", "start"), daysOver("c", "3"), node("ok", "approved")], edges: [edge("start", "c"), edge("c", "ok", "matched:c:s1")] };
    expect(runFrom(flow, "start", context({ total_days: 1 })).outcome).toMatchObject({ kind: "error" });
  });

  it("stops a loop that slipped past validation", () => {
    const flow: FlowDefinition = { nodes: [node("start", "start"), node("a", "notification"), node("b", "notification")], edges: [edge("start", "a"), edge("a", "b"), edge("b", "a")] };
    expect(runFrom(flow, "start", context()).outcome).toMatchObject({ kind: "error", message: expect.stringContaining("vượt quá") });
  });
});

describe("hasLaterApproval", () => {
  it("looks past conditions and notifications", () => {
    expect(hasLaterApproval(branching, "start")).toBe(true);
    expect(hasLaterApproval(chain, "manager")).toBe(true);
    expect(hasLaterApproval(chain, "director")).toBe(false);
  });
});

describe("pickWorkflow", () => {
  const workflow = (id: string, subObject: string, updatedAt: string, extra: Record<string, string> = {}) => ({
    id,
    objectType: "leave",
    subObject,
    status: "active",
    updatedAt: new Date(updatedAt),
    ...extra
  });

  it("prefers an exact sub-type, then the newest", () => {
    const list = [workflow("all-new", "all", "2026-11-20"), workflow("annual-old", "annual", "2026-01-01"), workflow("all-old", "all", "2026-01-01")];
    expect(pickWorkflow(list, "leave", "annual")?.id).toBe("annual-old");
    expect(pickWorkflow(list, "leave", "sick")?.id).toBe("all-new");
  });

  it("ignores inactive workflows and other types", () => {
    const list = [workflow("draft", "all", "2026-11-20", { status: "draft" }), workflow("ot", "all", "2026-11-20", { objectType: "overtime" })];
    expect(pickWorkflow(list, "leave", null)).toBeNull();
  });
});
