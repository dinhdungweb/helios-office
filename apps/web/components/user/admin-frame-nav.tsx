"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppLauncher } from "@/components/dashboard/app-launcher";
import {
  CheckCircle,
  ClipboardText,
  GearSix,
  House,
  Megaphone,
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";

type AdminNavItem = {
  key: string;
  label: string;
  href: string;
  icon: Icon;
  exact?: boolean;
  activeHashes?: string[];
};

const adminRailItems: AdminNavItem[] = [
  { key: "dashboard", label: "Trang chủ", href: "/admin", icon: House, exact: true },
  { key: "approvals", label: "Phê duyệt", href: "/admin/approvals-alerts", icon: CheckCircle },
  {
    key: "settings",
    label: "Cấu hình",
    href: "/admin/settings#system-settings",
    icon: GearSix,
    activeHashes: ["#system-settings", "#module-settings"]
  },
  { key: "logs", label: "Nhật ký", href: "/admin/settings#audit-logs", icon: ClipboardText, activeHashes: ["#audit-logs"] }
];

const adminMobileItems = adminRailItems.filter((item) =>
  ["dashboard", "approvals", "settings", "logs"].includes(item.key)
);

function splitHref(href: string) {
  const [path, hash] = href.split("#");

  return {
    path,
    hash: hash ? `#${hash}` : ""
  };
}

function useCurrentHash() {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => {
      setHash(window.location.hash);
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  return hash;
}

function isActiveItem(pathname: string, currentHash: string, item: AdminNavItem) {
  const itemHref = splitHref(item.href);

  if (item.activeHashes) {
    const normalizedHash = currentHash || (item.key === "settings" ? itemHref.hash : "");

    return pathname === itemHref.path && item.activeHashes.includes(normalizedHash);
  }

  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminRail() {
  const pathname = usePathname();
  const currentHash = useCurrentHash();

  return (
    <aside className="user-rail admin-rail" aria-label="Điều hướng quản trị">
      <div className="user-rail-launcher">
        <AppLauncher />
      </div>

      <nav className="user-rail-nav admin-rail-nav" aria-label="Module quản trị">
        {adminRailItems.map((item) => {
          const isActive = isActiveItem(pathname, currentHash, item);

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

export function AdminMobileNav() {
  const pathname = usePathname();
  const currentHash = useCurrentHash();

  return (
    <nav className="user-mobile-nav admin-mobile-nav" aria-label="Điều hướng quản trị trên mobile">
      {adminMobileItems.map((item) => {
        const isActive = isActiveItem(pathname, currentHash, item);

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
