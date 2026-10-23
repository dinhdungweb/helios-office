import { getCurrentSessionUserOrSignOut } from "@/lib/auth-user";

// Tabs of the "Công" module, as in 1Office's Chấm công: everyone has their own timesheet; HR (the
// HCNS permission group) also sees the shift schedule and the settings. Each tab shows only with
// the permissions its API needs.

export type AttendanceModuleTabKey = "personal" | "timesheet" | "shift-schedule" | "devices" | "settings";

export type AttendanceModuleTab = { key: AttendanceModuleTabKey; label: string; href: string; active: boolean };

const ATTENDANCE_READ = [
  "permission.attendance.view",
  "permission.attendance.manage",
  "permission.attendance-timesheets.view",
  "permission.attendance-timesheets.manage"
];
const ATTENDANCE_SETUP = ["permission.attendance-timesheets.manage"];
// Raw punches are readable with attendance view; machines and sync errors need their own rights.
const DEVICE_MANAGE = "attendance.device.manage";
const DEVICE_TAB = [DEVICE_MANAGE, "permission.attendance.manage", "permission.attendance.view"];

const TABS: Array<{ key: AttendanceModuleTabKey; label: string; href: string; permissions: string[] | null }> = [
  { key: "personal", label: "Bảng công cá nhân", href: "/user/attendance", permissions: null },
  { key: "timesheet", label: "Bảng chấm công", href: "/user/attendance/timesheet", permissions: ATTENDANCE_READ },
  { key: "shift-schedule", label: "Phân ca", href: "/user/attendance/shift-schedule", permissions: ATTENDANCE_READ },
  { key: "devices", label: "Máy chấm công", href: "/user/attendance/devices", permissions: DEVICE_TAB },
  { key: "settings", label: "Cài đặt", href: "/admin/settings/shifts", permissions: ATTENDANCE_SETUP }
];

export async function getAttendanceModuleTabs(active: AttendanceModuleTabKey): Promise<AttendanceModuleTab[]> {
  const account = (await getCurrentSessionUserOrSignOut())?.account;
  const isAdmin = account?.adminRole === "system_admin";
  const granted = new Set(account?.effectivePermissionKeys ?? []);

  return TABS.filter((tab) => !tab.permissions || isAdmin || tab.permissions.some((key) => granted.has(key))).map(({ key, label, href }) => ({
    key,
    label,
    href,
    active: key === active
  }));
}

// Whether the viewer may change a day by hand (AT-15): the API needs permission.attendance.manage.
export async function canEditAttendance() {
  const account = (await getCurrentSessionUserOrSignOut())?.account;
  return account?.adminRole === "system_admin" || Boolean(account?.effectivePermissionKeys?.includes("permission.attendance.manage"));
}

// Whether the viewer may lock and reopen months (AT-17).
export async function canLockAttendancePeriods() {
  const account = (await getCurrentSessionUserOrSignOut())?.account;
  return account?.adminRole === "system_admin" || Boolean(account?.effectivePermissionKeys?.includes("permission.attendance-period.lock"));
}

// Whether the viewer may open confirmation and handle feedback (AT-24).
export async function canManageConfirmation() {
  const account = (await getCurrentSessionUserOrSignOut())?.account;
  const keys = account?.effectivePermissionKeys ?? [];
  return account?.adminRole === "system_admin" || keys.includes("permission.attendance-timesheets.manage") || keys.includes("permission.attendance.manage");
}

// What the "Máy chấm công" tab shows (AT-19/20/21): machines, sync errors and raw punches.
export async function getDeviceAccess() {
  const account = (await getCurrentSessionUserOrSignOut())?.account;
  const isAdmin = account?.adminRole === "system_admin";
  const keys = new Set(account?.effectivePermissionKeys ?? []);
  return {
    devices: isAdmin || keys.has(DEVICE_MANAGE),
    errors: isAdmin || keys.has(DEVICE_MANAGE) || keys.has("permission.attendance.manage"),
    logs: isAdmin || DEVICE_TAB.some((key) => keys.has(key))
  };
}
