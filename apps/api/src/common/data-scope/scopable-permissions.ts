// Permissions that read or change per-employee data and are therefore limited by data scope.
// Configuration, menu, module, recruitment (candidates are not employees yet), social and
// document permissions stay yes/no. Keep in sync with migration 20261020053407_data_scope.

const scopedMatrixItems = [
  "attendance",
  "attendance-timesheets",
  "requests",
  "approvals",
  "payroll",
  "insurance",
  "hrm-employees",
  "hrm-contracts",
  "hrm-decisions",
  "kpi-goals",
  "kpi-evaluation",
  "performance-reviews",
  "training",
  "assets",
  "work-timesheet"
];

export const SCOPABLE_PERMISSION_KEYS: readonly string[] = [
  ...scopedMatrixItems.flatMap((item) => [`permission.${item}.view`, `permission.${item}.manage`]),
  "employees.department.manage",
  "hr.dashboard.people.view",
  "hr.dashboard.attendance.view",
  "hr.dashboard.contracts.view",
  "hr.dashboard.requests.view",
  "hr.dashboard.birthdays.view",
  "hr.dashboard.analytics.view",
  "hr.dashboard.organization.view",
  "reports.company.view"
];

export function isScopablePermission(key: string) {
  return SCOPABLE_PERMISSION_KEYS.includes(key);
}
