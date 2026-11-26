import { evaluateClause, evaluateCondition } from "./conditions";
import type { ConditionClause, ConditionConfig } from "./flow";

const clause = (field: string, operator: ConditionClause["operator"], rightValue: string, extra: Partial<ConditionClause> = {}): ConditionClause => ({
  id: `${field}-${operator}`,
  field,
  operator,
  rightType: "value",
  rightValue,
  ...extra
});

const record = {
  total_days: 4,
  quantity_text: "2,5",
  leave_type: "annual",
  department: "dep-sales",
  created_at: "2026-11-20T03:00:00.000Z",
  from_date: "2026-12-24",
  to_date: "2026-12-26",
  departments_chain: ["dep-sales", "dep-hq"],
  paid: true,
  title: "Nghỉ phép Tết"
};

describe("evaluateClause", () => {
  it.each<[string, ConditionClause, boolean]>([
    ["number greater", clause("total_days", "greater_than", "3"), true],
    ["number not greater", clause("total_days", "greater_than", "4"), false],
    ["number less", clause("total_days", "less_than", "5"), true],
    ["decimal comma", clause("quantity_text", "greater_than", "2"), true],
    ["equals text ignores case", clause("leave_type", "equals", "ANNUAL"), true],
    ["not equals", clause("leave_type", "not_equals", "sick"), true],
    ["equals boolean", clause("paid", "equals", "true"), true],
    ["contains text", clause("title", "contains", "tết"), true],
    ["not contains text", clause("title", "not_contains", "ốm"), true],
    ["contains in list", clause("departments_chain", "contains", "dep-hq"), true],
    ["equals against a list", clause("departments_chain", "equals", "dep-sales"), true],
    ["date after", clause("from_date", "greater_than", "2026-12-01"), true],
    ["date compare to field", clause("to_date", "greater_than", "from_date", { rightType: "field" }), true],
    ["MONTH()", clause("from_date", "equals", "12", { leftFunction: "month" }), true],
    ["YEAR()", clause("created_at", "equals", "2026", { leftFunction: "year" }), true],
    ["ROUND()", clause("quantity_text", "equals", "3", { leftFunction: "round" }), true],
    ["missing field is false", clause("nothing", "not_equals", "x"), false],
    ["missing field is false for not_contains", clause("nothing", "not_contains", "x"), false],
    ["empty right value is false", clause("leave_type", "equals", ""), false],
    ["text cannot be greater", clause("leave_type", "greater_than", "a"), false]
  ])("%s", (_name, value, expected) => {
    expect(evaluateClause(value, record)).toBe(expected);
  });
});

describe("evaluateCondition", () => {
  const config = (groups: ConditionClause[][]): ConditionConfig => ({ name: "c", groups: groups.map((clauses, index) => ({ id: `g${index}`, clauses })) });

  it("ANDs clauses inside a group", () => {
    expect(evaluateCondition(config([[clause("total_days", "greater_than", "3"), clause("leave_type", "equals", "annual")]]), record)).toBe(true);
    expect(evaluateCondition(config([[clause("total_days", "greater_than", "3"), clause("leave_type", "equals", "sick")]]), record)).toBe(false);
  });

  it("ORs groups", () => {
    expect(evaluateCondition(config([[clause("leave_type", "equals", "sick")], [clause("total_days", "greater_than", "3")]]), record)).toBe(true);
  });

  it("ignores unfinished clauses and is false when nothing is set", () => {
    expect(evaluateCondition(config([[clause("total_days", "greater_than", "3"), clause("", "", "")]]), record)).toBe(true);
    expect(evaluateCondition(config([[clause("", "", "")]]), record)).toBe(false);
    expect(evaluateCondition(undefined, record)).toBe(false);
  });
});
