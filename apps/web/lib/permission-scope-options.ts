import { dataScopeLevels, type DataScopeLevel } from "@/lib/data-scope";

// "Quản lý" / "Xem" dropdown values for scopable permissions in the permission matrices (group and
// per-account overrides): `${column}_${level}`, e.g. "view_department_tree" (docs/design/data-scope.md).

export type ScopedPermissionColumn = "manage" | "view";

export const scopeOptionLabels: Record<ScopedPermissionColumn, Record<DataScopeLevel, string>> = {
  manage: {
    company: "Quản lý toàn công ty",
    branch: "Quản lý chi nhánh",
    department_tree: "Quản lý phòng ban & cấp dưới",
    department: "Quản lý phòng ban",
    self: "Quản lý của bản thân"
  },
  view: {
    company: "Xem toàn công ty",
    branch: "Xem chi nhánh",
    department_tree: "Xem phòng ban & cấp dưới",
    department: "Xem phòng ban",
    self: "Xem của bản thân"
  }
};

// Matches the API default for grants without an explicit scope.
export const defaultGrantScope: DataScopeLevel = "department";

export const noPermissionOption = { label: "Không có", value: "none" };

// Widest first, after "Không có".
export function scopedOptions(column: ScopedPermissionColumn) {
  return [
    noPermissionOption,
    ...[...dataScopeLevels].reverse().map((level) => ({ label: scopeOptionLabels[column][level], value: `${column}_${level}` }))
  ];
}

// "view_department_tree" -> "department_tree"; legacy "view_all" -> "company".
export function scopeFromActionValue(column: ScopedPermissionColumn, value: string): DataScopeLevel | null {
  const level = value.startsWith(`${column}_`) ? value.slice(column.length + 1) : "";

  if (level === "all") {
    return "company";
  }

  return (dataScopeLevels as readonly string[]).includes(level) ? (level as DataScopeLevel) : null;
}
