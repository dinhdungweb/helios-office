import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PersonnelSettingsMobileNavigation } from "@/components/admin/personnel-settings-mobile-navigation";
import { ProfileMenu } from "@/components/user/profile-menu";
import { getCurrentSessionUser } from "@/lib/auth-user";
import { currentUser } from "@/lib/mock-data";
import {
  Bell,
  BookmarkSimple,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChatCircle,
  GearSix,
  House,
  MagnifyingGlass,
  Package,
  SlidersHorizontal
} from "@/lib/icons";

export type PersonnelSettingsItem = "position" | "title" | "workplace" | "internal-penalty" | "benefits" | "approval";

type PersonnelSettingsWorkspaceShellProps = {
  activeItem: PersonnelSettingsItem;
  children: ReactNode;
  searchAction: string;
  searchDefaultValue?: string;
};

const generalItems = [
  { key: "position", href: "/admin/settings/job-positions", label: "Vị trí công việc" },
  { key: "title", href: "/admin/settings/job-titles", label: "Chức vụ" },
  { key: "workplace", href: "/admin/settings/workplaces", label: "Nơi làm việc" },
  { key: "internal-penalty", href: "/admin/settings/internal-penalties", label: "Phạt nội bộ" },
  { key: "benefits", href: "/admin/settings/welfare-benefits", label: "Chế độ phúc lợi" },
  { key: "career-path", label: "Lộ trình thăng tiến" },
  { key: "shift", label: "Cài đặt ca" },
  { key: "approval", href: "/admin/settings/approval-workflows", label: "Quy trình duyệt" }
] as const;

const objectItems = [
  { key: "profile", label: "Hồ sơ nhân sự" },
  { key: "contract", label: "Hợp đồng lao động" },
  { key: "decision", label: "Quyết định" }
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

function PersonnelSettingsNavigation({
  activeItem,
  idPrefix
}: {
  activeItem: PersonnelSettingsItem;
  idPrefix: string;
}) {
  const generalGroupId = `${idPrefix}-general-settings-group`;
  const objectGroupId = `${idPrefix}-object-settings-group`;

  return (
    <nav className="personnel-settings-nav" aria-label="Điều hướng cài đặt nhân sự">
      <section aria-labelledby={generalGroupId}>
        <h2 id={generalGroupId}>
          <GearSix size={18} weight="duotone" aria-hidden="true" />
          <span>Cài đặt chung</span>
          <CaretDown size={16} weight="duotone" aria-hidden="true" />
        </h2>
        <div>
          {generalItems.map((item) => {
            const isCurrent = item.key === activeItem;

            return "href" in item ? (
              <a
                className={isCurrent ? "is-current" : undefined}
                href={item.href}
                key={item.key}
                aria-current={isCurrent ? "page" : undefined}
              >
                {item.label}
              </a>
            ) : (
              <span className="is-disabled" key={item.key} aria-disabled="true">
                {item.label}
              </span>
            );
          })}
        </div>
      </section>

      <section aria-labelledby={objectGroupId}>
        <h2 id={objectGroupId}>
          <Package size={18} weight="duotone" aria-hidden="true" />
          <span>Cài đặt đối tượng</span>
          <CaretDown size={16} weight="duotone" aria-hidden="true" />
        </h2>
        <div>
          {objectItems.map((item) => (
            <span className="is-disabled has-caret" key={item.key} aria-disabled="true">
              {item.label}
              <CaretRight size={15} weight="duotone" aria-hidden="true" />
            </span>
          ))}
        </div>
      </section>
    </nav>
  );
}

export async function PersonnelSettingsWorkspaceShell({
  activeItem,
  children,
  searchAction,
  searchDefaultValue = ""
}: PersonnelSettingsWorkspaceShellProps) {
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
    <div className="personnel-settings-shell">
      <aside className="personnel-settings-sidebar">
        <a className="personnel-settings-back" href="/apps/personnel-profile-profile">
          <CaretLeft size={17} weight="duotone" aria-hidden="true" />
          Quay lại phân hệ
        </a>
        <PersonnelSettingsNavigation activeItem={activeItem} idPrefix="personnel-desktop" />
      </aside>

      <div className="personnel-settings-workspace">
        <header className="personnel-settings-topbar">
          <PersonnelSettingsMobileNavigation activeItem={activeItem} />

          <h1>Nhân sự</h1>

          <form className="personnel-settings-search" action={searchAction} role="search">
            <MagnifyingGlass size={17} weight="duotone" aria-hidden="true" />
            <label className="sr-only" htmlFor="personnel-settings-search">Tìm kiếm</label>
            <input
              defaultValue={searchDefaultValue}
              id="personnel-settings-search"
              name="q"
              placeholder="Tìm kiếm"
              type="search"
            />
            <button className="icon-button" type="submit" aria-label="Tìm kiếm danh mục">
              <SlidersHorizontal size={17} weight="duotone" aria-hidden="true" />
            </button>
          </form>

          <nav className="personnel-settings-top-actions" aria-label="Truy cập nhanh">
            <span className="personnel-settings-brand" aria-hidden="true">Λ</span>
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

        <main className="personnel-settings-main">{children}</main>
      </div>
    </div>
  );
}
