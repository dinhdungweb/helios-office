import type { ConditionClause, ConditionConfig } from "./flow";

// Evaluates a condition node's slot against a flat record built from the request
// (docs/design/approval-engine.md §5.6). Clauses in a group are AND, groups are OR. A clause whose
// value is missing is false whatever the operator. Pure.

export type ConditionRecord = Record<string, unknown>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T|$)/;

function isBlank(value: unknown) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "" && !ISO_DATE.test(value)) {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value !== null && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return null;
}

function applyFunction(fn: ConditionClause["leftFunction"], value: unknown): unknown {
  if (!fn) return value;
  if (fn === "round") {
    const number = asNumber(value);
    return number === null ? null : Math.round(number);
  }
  const date = asDate(value);
  if (!date) return null;
  // Dates in requests are calendar dates kept as UTC midnight.
  return fn === "month" ? date.getUTCMonth() + 1 : date.getUTCFullYear();
}

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("vi") : value;
}

function equal(left: unknown, right: unknown): boolean {
  if (Array.isArray(left)) return left.some((item) => equal(item, right));
  const leftNumber = asNumber(left);
  const rightNumber = asNumber(right);
  if (leftNumber !== null && rightNumber !== null) return leftNumber === rightNumber;
  const leftDate = asDate(left);
  const rightDate = asDate(right);
  if (leftDate && rightDate) return leftDate.getTime() === rightDate.getTime();
  if (typeof left === "boolean" || typeof right === "boolean") return String(left) === String(right);
  return normalize(left) === normalize(right);
}

function compare(left: unknown, right: unknown): number | null {
  const leftNumber = asNumber(left);
  const rightNumber = asNumber(right);
  if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;
  const leftDate = asDate(left);
  const rightDate = asDate(right);
  if (leftDate && rightDate) return leftDate.getTime() - rightDate.getTime();
  return null;
}

function contains(left: unknown, right: unknown): boolean {
  if (Array.isArray(left)) return left.some((item) => equal(item, right));
  if (typeof left === "string" && right !== null && right !== undefined) {
    return normalize(left as string)!.toString().includes(String(normalize(String(right))));
  }
  return false;
}

export function evaluateClause(clause: ConditionClause, record: ConditionRecord): boolean {
  const left = applyFunction(clause.leftFunction, record[clause.field]);
  const right = clause.rightType === "field" ? record[clause.rightValue] : clause.rightValue;
  if (isBlank(left) || isBlank(right)) return false;

  switch (clause.operator) {
    case "equals":
      return equal(left, right);
    case "not_equals":
      return !equal(left, right);
    case "contains":
      return contains(left, right);
    case "not_contains":
      return !contains(left, right);
    case "greater_than": {
      const result = compare(left, right);
      return result !== null && result > 0;
    }
    case "less_than": {
      const result = compare(left, right);
      return result !== null && result < 0;
    }
    default:
      return false;
  }
}

function isComplete(clause: ConditionClause) {
  return Boolean(clause.field && clause.operator);
}

export function evaluateCondition(config: ConditionConfig | undefined, record: ConditionRecord): boolean {
  const groups = (config?.groups ?? []).map((group) => group.clauses.filter(isComplete)).filter((clauses) => clauses.length > 0);
  return groups.some((clauses) => clauses.every((clause) => evaluateClause(clause, record)));
}
