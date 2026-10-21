// See docs/design/data-scope.md. Ordered from narrowest to widest.
export const SCOPE_LEVELS = ["self", "department", "department_tree", "branch", "company"] as const;

export type ScopeLevel = (typeof SCOPE_LEVELS)[number];

export const DEFAULT_NEW_GRANT_SCOPE: ScopeLevel = "department";

export type ResolvedScope =
  | { level: "company" }
  | {
      level: Exclude<ScopeLevel, "company">;
      // Departments whose members are visible.
      departmentIds: string[];
      // Individually visible employees: the account's own employee and, by decision 1 of the
      // design, everyone reporting to them directly or indirectly.
      employeeIds: string[];
    };

export const COMPANY_SCOPE: ResolvedScope = { level: "company" };

export function isScopeLevel(value: unknown): value is ScopeLevel {
  return typeof value === "string" && (SCOPE_LEVELS as readonly string[]).includes(value);
}

export function widerScope(left: ScopeLevel, right: ScopeLevel): ScopeLevel {
  return SCOPE_LEVELS.indexOf(left) >= SCOPE_LEVELS.indexOf(right) ? left : right;
}

// Reads a { key: scope } JSON column, dropping anything malformed.
export function parseScopeMap(value: unknown): Record<string, ScopeLevel> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, ScopeLevel] => isScopeLevel(entry[1]))
  );
}
