import {
  Bell,
  BookmarkSimple,
  ChatCircle,
  GearSix,
  House,
  MagnifyingGlass,
  SlidersHorizontal
} from "@/lib/icons";
import type { ReactNode } from "react";
import { AppLauncher } from "@/components/dashboard/app-launcher";
import { ProfileMenu } from "@/components/user/profile-menu";
import { UserQuickCreateMenu } from "@/components/user/user-quick-create-menu";
import { UserPersonalNavigation } from "@/components/user/user-personal-navigation";
import { getCurrentSessionUser, type CurrentSessionUser } from "@/lib/auth-user";
import { currentUser } from "@/lib/mock-data";
import { getOrgChartData, type OrgChartData } from "@/lib/org-chart-api";
import type { UserProfile } from "@/lib/mock-data";

export type UserModuleKey = "home" | "attendance" | "payroll" | "requests" | "profile" | "loans" | "settings" | "admin" | "hcns";

type UserFrameProps = {
  activeModule: UserModuleKey;
  children: ReactNode;
  showSearch?: boolean;
  title?: string;
};

type UserFrameViewer = {
  id: string;
  isAdmin: boolean;
  permissionKeys: string[];
  profile: UserProfile;
};

function initialsFromName(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || currentUser.avatar;
}

function resolveViewer(user: CurrentSessionUser | null): UserFrameViewer {
  const account = user?.account;
  const name = account?.displayName ?? user?.name ?? currentUser.name;
  const isAdmin = account?.adminRole === "system_admin";

  return {
    id: account?.id ?? user?.sub ?? "guest",
    isAdmin,
    permissionKeys: account?.effectivePermissionKeys ?? [],
    profile: {
      ...currentUser,
      name,
      avatar: initialsFromName(name),
      title: isAdmin ? "Admin hệ thống" : currentUser.title,
      department: account?.email ?? user?.email ?? currentUser.department
    }
  };
}

function UserTopbar({
  activeModule,
  canOpenAdminSettings,
  showSearch,
  title,
  user,
  orgChartData
}: {
  activeModule: UserModuleKey;
  canOpenAdminSettings: boolean;
  orgChartData?: OrgChartData;
  showSearch?: boolean;
  title?: string;
  user: UserProfile;
}) {
  return (
    <header className="user-topbar">
      <div className="user-title-cluster">
        <div className="user-mobile-launcher">
          <AppLauncher />
        </div>
        <UserQuickCreateMenu
          mode={activeModule === "admin" ? "admin" : "default"}
          orgChartData={activeModule === "admin" ? orgChartData : undefined}
        />
        <h1>{title ?? user.name}</h1>
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
        {canOpenAdminSettings ? (
          <a className="icon-button" href="/admin/settings" aria-label="Cài đặt hệ thống">
            <GearSix size={18} weight="duotone" aria-hidden="true" />
          </a>
        ) : null}
        <ProfileMenu user={user} />
      </nav>
    </header>
  );
}

export async function UserFrame({ activeModule, children, showSearch, title }: UserFrameProps) {
  const isAdminFrame = activeModule === "admin";
  const isHcnsFrame = activeModule === "hcns";
  const [sessionUser, orgChartData] = await Promise.all([
    getCurrentSessionUser(),
    isAdminFrame ? getOrgChartData() : Promise.resolve(undefined)
  ]);
  const viewer = resolveViewer(sessionUser);

  return (
    <div className="user-shell">
      {isAdminFrame ? (
        <UserPersonalNavigation
          accountId={viewer.id}
          isAdmin={viewer.isAdmin}
          permissionKeys={viewer.permissionKeys}
          variant="admin"
        />
      ) : isHcnsFrame ? (
        <UserPersonalNavigation
          accountId={viewer.id}
          isAdmin={viewer.isAdmin}
          permissionKeys={viewer.permissionKeys}
          variant="hcns"
        />
      ) : (
        <UserPersonalNavigation
          activeModule={activeModule}
          accountId={viewer.id}
          isAdmin={viewer.isAdmin}
          permissionKeys={viewer.permissionKeys}
        />
      )}

      <div className="user-workspace">
        <UserTopbar
          activeModule={activeModule}
          canOpenAdminSettings={viewer.isAdmin}
          orgChartData={orgChartData}
          showSearch={showSearch}
          title={title}
          user={viewer.profile}
        />
        {children}
      </div>
    </div>
  );
}
