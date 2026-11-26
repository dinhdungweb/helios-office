import { defaultFlow, parseFlow, sanitizeFlow, splitAudience, validateFlow, type FlowDefinition, type FlowNode } from "./flow";

const approval = (id: string, approverId = "emp-1"): FlowNode => ({ id, type: "approval", approvalConfig: { name: id, approverId } });
const condition = (id: string, slots = [`${id}:s1`]): FlowNode => ({
  id,
  type: "condition",
  conditionSlots: slots.map((slotId) => ({
    id: slotId,
    config: { name: id, groups: [{ id: "g", clauses: [{ id: "c", field: "total_days", operator: "greater_than", rightType: "value", rightValue: "3" }] }] }
  }))
});
const node = (id: string, type: FlowNode["type"]): FlowNode => ({ id, type });
const edge = (source: string, target: string, branch = "default") => ({ source, target, branch });

function flow(nodes: FlowNode[], edges: Array<{ source: string; target: string; branch?: string }>): FlowDefinition {
  return { nodes, edges };
}

describe("validateFlow", () => {
  it("accepts a straight chain", () => {
    const value = flow([node("start", "start"), approval("a"), approval("b"), node("ok", "approved")], [edge("start", "a"), edge("a", "b"), edge("b", "ok")]);
    expect(validateFlow(value)).toEqual([]);
  });

  it("accepts the built-in default workflow", () => {
    expect(validateFlow(defaultFlow())).toEqual([]);
  });

  it("accepts a condition with matched and node-level unmatched branches", () => {
    const value = flow(
      [node("start", "start"), condition("c"), approval("director"), approval("manager"), node("ok", "approved")],
      [edge("start", "c"), edge("c", "director", "matched:c:s1"), edge("c", "manager", "unmatched"), edge("director", "ok"), edge("manager", "ok")]
    );
    expect(validateFlow(value)).toEqual([]);
  });

  it("accepts a slot-level unmatched branch as the fall-through", () => {
    const value = flow(
      [node("start", "start"), condition("c"), node("ok", "approved"), node("no", "rejected")],
      [edge("start", "c"), edge("c", "ok", "matched:c:s1"), edge("c", "no", "unmatched:c:s1")]
    );
    expect(validateFlow(value)).toEqual([]);
  });

  it.each<[string, FlowDefinition, string]>([
    ["no start", flow([approval("a"), node("ok", "approved")], [edge("a", "ok")]), "đúng một điểm bắt đầu"],
    ["two starts", flow([node("s1", "start"), node("s2", "start"), node("ok", "approved")], [edge("s1", "ok"), edge("s2", "ok")]), "đúng một điểm bắt đầu"],
    ["no end", flow([node("start", "start"), approval("a")], [edge("start", "a")]), "chưa có node Đã duyệt"],
    ["dangling step", flow([node("start", "start"), approval("a"), node("ok", "approved")], [edge("start", "a")]), "chưa nối tới bước tiếp theo"],
    ["unreachable node", flow([node("start", "start"), approval("a"), approval("b"), node("ok", "approved")], [edge("start", "a"), edge("a", "ok"), edge("b", "ok")]), "không nối từ điểm bắt đầu"],
    ["cycle", flow([node("start", "start"), approval("a"), approval("b"), node("ok", "approved")], [edge("start", "a"), edge("a", "b"), edge("b", "a")]), "vòng lặp"],
    ["parallel branch", flow([node("start", "start"), approval("a"), approval("b"), node("ok", "approved")], [edge("start", "a"), edge("a", "b"), edge("a", "ok"), edge("b", "ok")]), "chỉ được có một đường đi tiếp"],
    ["approver missing", flow([node("start", "start"), approval("a", ""), node("ok", "approved")], [edge("start", "a"), edge("a", "ok")]), "chưa chọn người duyệt"],
    ["condition without fall-through", flow([node("start", "start"), condition("c"), node("ok", "approved")], [edge("start", "c"), edge("c", "ok", "matched:c:s1")]), "Không thỏa mãn"],
    ["terminal with an exit", flow([node("start", "start"), node("ok", "approved"), approval("a")], [edge("start", "ok"), edge("ok", "a"), edge("a", "ok")]), "không được có đường đi tiếp"],
    ["edge to a missing node", flow([node("start", "start"), node("ok", "approved")], [edge("start", "ok"), edge("start", "ghost")]), "node không tồn tại"]
  ])("rejects %s", (_name, value, message) => {
    expect(validateFlow(value).join(" | ")).toContain(message);
  });

  it("rejects a condition slot left empty", () => {
    const empty: FlowNode = { id: "c", type: "condition", conditionSlots: [{ id: "c:s1" }] };
    const value = flow([node("start", "start"), empty, node("ok", "approved")], [edge("start", "c"), edge("c", "ok", "matched:c:s1"), edge("c", "ok", "unmatched")]);
    expect(validateFlow(value).join(" | ")).toContain("có ô chưa cài đặt");
  });
});

describe("parseFlow", () => {
  it("drops malformed nodes and edges instead of throwing", () => {
    const parsed = parseFlow({ nodes: [{ id: "start", type: "start" }, { id: 1 }, { id: "x", type: "unknown" }, null], edges: [{ source: "start" }, { source: "a", target: "b" }] });
    expect(parsed.nodes.map((item) => item.id)).toEqual(["start"]);
    expect(parsed.edges).toHaveLength(1);
    expect(parseFlow("nonsense")).toEqual({ nodes: [], edges: [] });
  });
});

describe("sanitizeFlow", () => {
  it("cleans notification and email content", () => {
    const value = sanitizeFlow(
      flow(
        [
          { id: "n", type: "notification", notificationConfig: { title: "t", recipientId: "x", content: "<p onclick=alert(1)>Hi</p><script>x</script>" } },
          { id: "e", type: "email", emailConfig: { title: "t", subject: "s", recipientId: "x", content: '<a href="javascript:x">y</a>' } }
        ],
        []
      )
    );
    expect(value.nodes[0].notificationConfig?.content).toBe("<p>Hi</p>");
    expect(value.nodes[1].emailConfig?.content).toBe("<a>y</a>");
  });
});

describe("splitAudience", () => {
  it("reads one id or a comma-separated list", () => {
    expect(splitAudience("a")).toEqual(["a"]);
    expect(splitAudience(" a, b ,,c")).toEqual(["a", "b", "c"]);
    expect(splitAudience(undefined)).toEqual([]);
  });
});
