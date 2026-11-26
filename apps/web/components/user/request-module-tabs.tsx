import type { Route } from "next";
import Link from "next/link";
import { getRequestAccess } from "@/lib/request-api";

export type RequestModuleTabKey = "list" | "balances" | "settings";

// Tab bar of the "Đơn từ" module, like 1Office: everyone has their requests and leave balance; leave
// settings show to people who manage leave (settings live in their module).
export async function RequestModuleTabs({ active }: { active: RequestModuleTabKey }) {
  const access = await getRequestAccess();
  const tabs: Array<{ key: RequestModuleTabKey; label: string; href: string; show: boolean }> = [
    { key: "list", label: "Danh sách đơn", href: "/user/requests", show: true },
    { key: "balances", label: "Quỹ phép", href: "/user/requests/balances", show: true },
    { key: "settings", label: "Cài đặt", href: "/user/requests/settings/leave-types", show: access.canManageLeave }
  ];

  return (
    <nav className="attendance-board-tabs request-module-tabs" aria-label="Phân hệ Đơn từ">
      {tabs
        .filter((tab) => tab.show)
        .map((tab) => (
          <Link key={tab.key} aria-current={tab.key === active ? "page" : undefined} className={tab.key === active ? "is-active" : undefined} href={tab.href as Route}>
            {tab.label}
          </Link>
        ))}
    </nav>
  );
}
