import { getCurrentSessionUserOrSignOut } from "@/lib/auth-user";

// Tabs of the "Công" module, as in 1Office's Chấm công: everyone has their own timesheet; HR (the
// HCNS permission group) also sees the shift schedule and the settings. Each tab shows only with
// the permissions its API needs.

export type AttendanceModuleTabKey = "personal" | "shift-schedule" | "settings";

export type AttendanceModuleTab = { key: AttendanceModuleTabKey; label: string; href: string; active: boolean };

const ATTENDANCE_READ = [
  "permission.attendance.view",
  "permission.attendance.manage",
  "permission.attendance-timesheets.view",
  "permission.attendance-timesheets.manage"
];
const ATTENDANCE_SETUP = ["permission.attendance-timesheets.manage"];

const TABS: Array<{ key: AttendanceModuleTabKey; label: string; href: string; permissions: string[] | null }> = [
  { key: "personal", label: "Bảng công cá nhân", href: "/user/attendance", permissions: null },
  { key: "shift-schedule", label: "Phân ca", href: "/user/attendance/shift-schedule", permissions: ATTENDANCE_READ },
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
