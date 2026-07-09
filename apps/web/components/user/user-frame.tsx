import {
  Bank,
  Bell,
  BookmarkSimple,
  CalendarCheck,
  ChatCircle,
  ClipboardText,
  House,
  IdentificationBadge,
  MagicWand,
  MagnifyingGlass,
  Megaphone,
  MoneyWavy,
  SlidersHorizontal
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { AppLauncher } from "@/components/dashboard/app-launcher";
import { UserQuickCreateMenu } from "@/components/user/user-quick-create-menu";
import { currentUser } from "@/lib/mock-data";

export type UserModuleKey = "home" | "attendance" | "payroll" | "requests" | "profile" | "loans" | "settings";

type UserRailItem = {
  key: UserModuleKey;
  label: string;
  href: string;
  icon: Icon;
};

type UserFrameProps = {
  activeModule: UserModuleKey;
  children: ReactNode;
  showSearch?: boolean;
  title?: string;
};

const userRailItems: UserRailItem[] = [
  { key: "home", label: "Trang chủ", href: "/user", icon: House },
  { key: "attendance", label: "Công", href: "/user?customMenu=user-board-attendance", icon: CalendarCheck },
  { key: "payroll", label: "Lương", href: "/user?customMenu=user-board-payroll", icon: Bank },
  { key: "requests", label: "Đơn từ", href: "/user?customMenu=user-board-requests", icon: ClipboardText },
  { key: "profile", label: "Hồ sơ", href: "/user?customMenu=user-board-profile", icon: IdentificationBadge },
  { key: "loans", label: "Vay", href: "#", icon: MoneyWavy },
  { key: "settings", label: "Tùy chỉnh", href: "#", icon: MagicWand }
];

function UserRail({ activeModule }: { activeModule: UserModuleKey }) {
  return (
    <aside className="user-rail" aria-label="Điều hướng cá nhân">
      <div className="user-rail-launcher">
        <AppLauncher />
      </div>

      <nav className="user-rail-nav" aria-label="Module cá nhân">
        {userRailItems.map((item) => {
          const isActive = item.key === activeModule;

          return (
            <a
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "user-rail-link is-current" : "user-rail-link"}
              href={item.href}
              key={item.key}
            >
              <item.icon size={19} weight="duotone" aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      <a className="user-ai-link" href="#ai-support" aria-label="AI Support">
        <Megaphone size={18} weight="duotone" aria-hidden="true" />
        <span>AI Support</span>
      </a>
    </aside>
  );
}

function UserMobileNav({ activeModule }: { activeModule: UserModuleKey }) {
  return (
    <nav className="user-mobile-nav" aria-label="Điều hướng cá nhân trên mobile">
      {userRailItems.slice(0, 5).map((item) => {
        const isActive = item.key === activeModule;

        return (
          <a
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "user-mobile-nav-link is-current" : "user-mobile-nav-link"}
            href={item.href}
            key={item.key}
          >
            <item.icon size={20} weight="duotone" aria-hidden="true" />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function UserTopbar({
  activeModule,
  showSearch,
  title
}: {
  activeModule: UserModuleKey;
  showSearch?: boolean;
  title?: string;
}) {
  return (
    <header className="user-topbar">
      <div className="user-title-cluster">
        <div className="user-mobile-launcher">
          <AppLauncher />
        </div>
        <UserQuickCreateMenu />
        <h1>{title ?? currentUser.name}</h1>
      </div>

      {showSearch ? (
        <form className="user-top-search" role="search" aria-label="Tìm kiếm đơn từ">
          <MagnifyingGlass size={17} weight="duotone" aria-hidden="true" />
          <label className="sr-only" htmlFor="user-top-search">
            Tìm kiếm
          </label>
          <input id="user-top-search" name="q" type="search" placeholder="Tìm kiếm" />
          <button className="icon-button" type="button" aria-label="Bộ lọc tìm kiếm">
            <SlidersHorizontal size={17} weight="duotone" aria-hidden="true" />
          </button>
        </form>
      ) : null}

      <nav className="user-top-actions" aria-label="Truy cập nhanh">
        <button className="icon-button" type="button" aria-label="Bài đã lưu">
          <BookmarkSimple size={18} weight="duotone" aria-hidden="true" />
        </button>
        <a
          className={activeModule === "home" ? "icon-button desktop-only-action is-active" : "icon-button desktop-only-action"}
          href="/user"
          aria-label="Trang chủ"
        >
          <House size={18} weight="duotone" aria-hidden="true" />
        </a>
        <button className="icon-button has-badge" type="button" aria-label="Tin nhắn, 1 chưa đọc">
          <ChatCircle size={18} weight="duotone" aria-hidden="true" />
          <span aria-hidden="true">1</span>
        </button>
        <button className="icon-button" type="button" aria-label="Thông báo">
          <Bell size={18} weight="duotone" aria-hidden="true" />
        </button>
        <a className="avatar-button" href="/user" aria-label={`Mở hồ sơ ${currentUser.name}`}>
          <span>{currentUser.avatar}</span>
        </a>
      </nav>
    </header>
  );
}

export function UserFrame({ activeModule, children, showSearch, title }: UserFrameProps) {
  return (
    <div className="user-shell">
      <UserRail activeModule={activeModule} />

      <div className="user-workspace">
        <UserTopbar activeModule={activeModule} showSearch={showSearch} title={title} />
        {children}
      </div>

      <UserMobileNav activeModule={activeModule} />
    </div>
  );
}
