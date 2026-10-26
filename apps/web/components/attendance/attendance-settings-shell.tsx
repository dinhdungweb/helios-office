import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AttendanceSettingsMobileNavigation } from "@/components/attendance/attendance-settings-mobile-navigation";
import { ATTENDANCE_SETTINGS_BACK, AttendanceSettingsNav, type AttendanceSettingsItem } from "@/components/attendance/attendance-settings-nav";
import { ProfileMenu } from "@/components/user/profile-menu";
import { getCurrentSessionUser } from "@/lib/auth-user";
import { currentUser } from "@/lib/mock-data";
import { Bell, BookmarkSimple, CaretLeft, ChatCircle, House } from "@/lib/icons";

// Settings inside the "Công" module, like 1Office's Timekeeping → Settings: a left menu of
// general and object settings and a way back to the module. HR with attendance setup rights may
// enter, not only system admins; each page's API still checks its own permission.
const SETTINGS_PERMISSIONS = ["permission.attendance-timesheets.manage", "permission.attendance.manage", "attendance.device.manage"];

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || currentUser.avatar
  );
}

export async function AttendanceSettingsShell({ activeItem, children }: { activeItem: AttendanceSettingsItem; children: ReactNode }) {
  const sessionUser = await getCurrentSessionUser();
  const account = sessionUser?.account;
  const allowed = account?.adminRole === "system_admin" || SETTINGS_PERMISSIONS.some((key) => account?.effectivePermissionKeys?.includes(key));
  if (!account || !allowed) redirect("/user/attendance");

  const name = account.displayName ?? sessionUser?.name ?? currentUser.name;
  const profile = { ...currentUser, name, avatar: initials(name), title: account.adminRole === "system_admin" ? "Admin hệ thống" : "Nhân sự", department: account.email ?? sessionUser?.email ?? currentUser.department };

  return (
    <div className="personnel-settings-shell">
      <aside className="personnel-settings-sidebar">
        <a className="personnel-settings-back" href={ATTENDANCE_SETTINGS_BACK}>
          <CaretLeft size={17} weight="duotone" aria-hidden="true" />
          Quay lại phân hệ
        </a>
        <AttendanceSettingsNav activeItem={activeItem} idPrefix="attendance-settings-desktop" label="Điều hướng cài đặt chấm công" />
      </aside>

      <div className="personnel-settings-workspace">
        <header className="personnel-settings-topbar">
          <AttendanceSettingsMobileNavigation activeItem={activeItem} />
          <h1>Chấm công</h1>
          <span />
          <nav className="personnel-settings-top-actions" aria-label="Truy cập nhanh">
            <span className="personnel-settings-brand" aria-hidden="true">
              Λ
            </span>
            <button aria-label="Bài đã lưu" className="icon-button" type="button">
              <BookmarkSimple size={18} weight="duotone" aria-hidden="true" />
            </button>
            <a aria-label="Trang chủ" className="icon-button" href="/user">
              <House size={18} weight="duotone" aria-hidden="true" />
            </a>
            <button aria-label="Tin nhắn" className="icon-button" type="button">
              <ChatCircle size={18} weight="duotone" aria-hidden="true" />
            </button>
            <button aria-label="Thông báo" className="icon-button" type="button">
              <Bell size={18} weight="duotone" aria-hidden="true" />
            </button>
            <ProfileMenu canOpenAdminSettings={account.adminRole === "system_admin"} user={profile} />
          </nav>
        </header>

        <main className="personnel-settings-main">{children}</main>
      </div>
    </div>
  );
}
