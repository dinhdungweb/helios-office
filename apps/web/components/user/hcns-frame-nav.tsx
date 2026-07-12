"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppLauncher } from "@/components/dashboard/app-launcher";
import {
  Briefcase,
  CalendarCheck,
  ClipboardText,
  House,
  Megaphone,
  Users,
  ChartLineUp
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";

type HcnsNavItem = {
  key: string;
  label: string;
  href: string;
  icon: Icon;
  exact?: boolean;
};

const hcnsRailItems: HcnsNavItem[] = [
  { key: "dashboard", label: "Trang chủ", href: "/hcns", icon: House, exact: true },
  { key: "attendance", label: "Công", href: "/hcns#attendance", icon: CalendarCheck },
  { key: "requests", label: "Đơn từ", href: "/hcns#requests", icon: ClipboardText },
  { key: "people", label: "Hồ sơ", href: "/hcns/employees", icon: Users },
  { key: "contracts", label: "Hợp đồng", href: "/hcns#contracts", icon: Briefcase },
  { key: "analytics", label: "BI HRM", href: "/hcns#analytics", icon: ChartLineUp }
];

const hcnsMobileItems = hcnsRailItems.filter((item) =>
  ["dashboard", "attendance", "requests", "people", "contracts"].includes(item.key)
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
    const syncHash = () => setHash(window.location.hash);

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  return hash;
}

function isActiveItem(pathname: string, currentHash: string, item: HcnsNavItem) {
  const itemHref = splitHref(item.href);

  if (item.exact) {
    return pathname === itemHref.path && currentHash === itemHref.hash;
  }

  if (itemHref.hash) {
    return pathname === itemHref.path && currentHash === itemHref.hash;
  }

  return pathname === itemHref.path || pathname.startsWith(`${itemHref.path}/`);
}

export function HcnsRail() {
  const pathname = usePathname();
  const currentHash = useCurrentHash();

  return (
    <aside className="user-rail hcns-rail" aria-label="Điều hướng HCNS">
      <div className="user-rail-launcher">
        <AppLauncher />
      </div>

      <nav className="user-rail-nav hcns-rail-nav" aria-label="Module HCNS">
        {hcnsRailItems.map((item) => {
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

export function HcnsMobileNav() {
  const pathname = usePathname();
  const currentHash = useCurrentHash();

  return (
    <nav className="user-mobile-nav hcns-mobile-nav" aria-label="Điều hướng HCNS trên mobile">
      {hcnsMobileItems.map((item) => {
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
