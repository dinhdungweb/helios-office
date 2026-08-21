import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SettingsMobileNavigation } from "@/components/admin/settings-mobile-navigation";
import { ProfileMenu } from "@/components/user/profile-menu";
import { getCurrentSessionUser } from "@/lib/auth-user";
import { currentUser } from "@/lib/mock-data";
import {
  Bell,
  BookmarkSimple,
  CaretLeft,
  ChatCircle,
  GearSix,
  House,
  LinkSimple,
  Users
} from "@/lib/icons";

export type SettingsWorkspaceItem = "system" | "session" | "two-factor";

type SettingsWorkspaceShellProps = {
  activeItem: SettingsWorkspaceItem;
  children: ReactNode;
  mainLabel: string;
};

const generalSettingsItems = [
  { key: "system", href: "/admin/settings/system", label: "Cài đặt hệ thống" },
  { key: "session", href: "/admin/settings/session", label: "Phiên làm việc" },
  { key: "two-factor", href: "/admin/settings/two-factor", label: "Bảo mật 2 lớp" }
] as const;

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || currentUser.avatar;
}

export async function SettingsWorkspaceShell({
  activeItem,
  children,
  mainLabel
}: SettingsWorkspaceShellProps) {
  const sessionUser = await getCurrentSessionUser();
  const account = sessionUser?.account;

  if (account?.adminRole !== "system_admin") {
    redirect("/user");
  }

  const name = account.displayName ?? sessionUser?.name ?? currentUser.name;
  const profile = {
    ...currentUser,
    name,
    avatar: initialsFromName(name),
    title: "Admin hệ thống",
    department: account.email ?? sessionUser?.email ?? currentUser.department
  };

  return (
    <div className="system-settings-shell">
      <aside className="system-settings-sidebar" aria-label="Điều hướng cài đặt">
        <a className="system-settings-back" href="/admin/settings/accounts">
          <CaretLeft size={17} weight="duotone" aria-hidden="true" />
          <span>Quay lại phân hệ</span>
        </a>

        <nav className="system-settings-nav">
          <section aria-labelledby="general-settings-group">
            <h2 id="general-settings-group">
              <GearSix size={17} weight="duotone" aria-hidden="true" />
              Cài đặt chung
            </h2>
            <div>
              {generalSettingsItems.map((item) => {
                const isCurrent = item.key === activeItem;

                return (
                  <a
                    className={isCurrent ? "is-current" : undefined}
                    href={item.href}
                    key={item.key}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="catalog-settings-group">
            <h2 id="catalog-settings-group">
              <GearSix size={17} weight="duotone" aria-hidden="true" />
              Danh mục
            </h2>
            <div>
              <a href="/admin/settings/accounts/groups">
                <Users size={15} weight="duotone" aria-hidden="true" />
                Nhóm User
              </a>
              <a href="/admin/settings/smtp">
                <LinkSimple size={15} weight="duotone" aria-hidden="true" />
                Tích hợp ký số
              </a>
            </div>
          </section>
        </nav>
      </aside>

      <div className="system-settings-workspace">
        <header className="system-settings-topbar">
          <SettingsMobileNavigation activeItem={activeItem} />
          <h1>Admin</h1>
          <nav aria-label="Truy cập nhanh">
            <button className="icon-button" type="button" aria-label="Bài đã lưu">
              <BookmarkSimple size={18} weight="duotone" aria-hidden="true" />
            </button>
            <a className="icon-button" href="/user" aria-label="Trang chủ">
              <House size={18} weight="duotone" aria-hidden="true" />
            </a>
            <button className="icon-button" type="button" aria-label="Tin nhắn">
              <ChatCircle size={18} weight="duotone" aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" aria-label="Thông báo">
              <Bell size={18} weight="duotone" aria-hidden="true" />
            </button>
            <ProfileMenu canOpenAdminSettings user={profile} />
          </nav>
        </header>

        <main className="system-settings-main" aria-label={mainLabel}>
          {children}
        </main>
      </div>
    </div>
  );
}
