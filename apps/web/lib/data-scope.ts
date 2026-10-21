// Data scope levels shared by server and client code (docs/design/data-scope.md).
// Kept free of server-only imports so client components can use the values.

// Narrowest to widest, same order as the API.
export const dataScopeLevels = ["self", "department", "department_tree", "branch", "company"] as const;
export type DataScopeLevel = (typeof dataScopeLevels)[number];

export function isDataScopeLevel(value: unknown): value is DataScopeLevel {
  return typeof value === "string" && (dataScopeLevels as readonly string[]).includes(value);
}
