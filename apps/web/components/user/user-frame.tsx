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
import type { UserProfile } from "@/lib/mock-data";
import { getOrgChartData, type OrgChartData } from "@/lib/org-chart-api";

export type UserModuleKey =
  | "home"
  | "attendance"
  | "payroll"
  | "requests"
  | "profile"
  | "loans"
  | "settings"
  | "admin"
  | "hcns"
  | "hcns-employees"
  | "hcns-contracts";

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

function hasAnyPermission(permissionSet: Set<string>, keys: string[]) {
  return keys.some((key) => permissionSet.has(key));
}

function getQuickCreateFallbackMenuKeys(viewer: UserFrameViewer, variant: "user" | "admin" | "hcns") {
  if (variant === "admin") {
    return [];
  }

  if (variant === "hcns") {
    return ["dashboard", "attendance", "requests", "people", "contracts"];
  }

  if (viewer.isAdmin) {
    return ["home", "admin-console", "admin-settings"];
  }

  const permissionSet = new Set(viewer.permissionKeys);
  const keys = ["home"];

  if (hasAnyPermission(permissionSet, ["menu.user.attendance"])) {
    keys.push("attendance");
  }

  if (hasAnyPermission(permissionSet, ["menu.user.requests", "requests.personal.create"])) {
    keys.push("requests");
  }

  if (hasAnyPermission(permissionSet, ["menu.user.profile", "reports.personal.view"])) {
    keys.push("profile");
  }

  if (hasAnyPermission(permissionSet, ["menu.work.tasks", "tasks.assigned.update"])) {
    keys.push("work-tasks");
  }

  return keys;
}

function UserTopbar({
  activeModule,
  canOpenAdminSettings,
  quickCreateFallbackMenuKeys,
  quickCreateMenuStorageKey,
  orgChartData,
  showSearch,
  title,
  user
}: {
  activeModule: UserModuleKey;
  canOpenAdminSettings: boolean;
  quickCreateFallbackMenuKeys: string[];
  quickCreateMenuStorageKey: string;
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
          fallbackMenuKeys={quickCreateFallbackMenuKeys}
          menuStorageKey={quickCreateMenuStorageKey}
          mode={activeModule === "admin" ? "admin" : "default"}
          orgChartData={orgChartData}
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
        <ProfileMenu canOpenAdminSettings={canOpenAdminSettings} user={user} />
      </nav>
    </header>
  );
}

export async function UserFrame({ activeModule, children, showSearch, title }: UserFrameProps) {
  const isAdminFrame = activeModule === "admin";
  const isHcnsFrame = activeModule === "hcns";
  const sidebarVariant = isAdminFrame ? "admin" : isHcnsFrame ? "hcns" : "user";
  const sessionUser = await getCurrentSessionUser();
  const quickCreateOrgChartData = isAdminFrame ? await getOrgChartData() : undefined;
  const viewer = resolveViewer(sessionUser);
  const quickCreateMenuStorageKey = sidebarVariant === "user"
    ? `helios:user-sidebar:${viewer.id}`
    : `helios:${sidebarVariant}.sidebar:${viewer.id}`;
  const quickCreateFallbackMenuKeys = getQuickCreateFallbackMenuKeys(viewer, sidebarVariant);

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
          quickCreateFallbackMenuKeys={quickCreateFallbackMenuKeys}
          quickCreateMenuStorageKey={quickCreateMenuStorageKey}
          orgChartData={quickCreateOrgChartData}
          showSearch={showSearch}
          title={title}
          user={viewer.profile}
        />
        {children}
      </div>
    </div>
  );
}
