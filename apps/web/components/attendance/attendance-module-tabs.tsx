import type { Route } from "next";
import Link from "next/link";
import type { AttendanceModuleTab } from "@/lib/attendance-module";

// Tab bar of the "Công" module; the server decides which tabs the viewer may see.
export function AttendanceModuleTabs({ tabs }: { tabs: AttendanceModuleTab[] }) {
  return (
    <nav className="attendance-board-tabs" aria-label="Phân hệ Công">
      {tabs.map((tab) => (
        <Link key={tab.key} aria-current={tab.active ? "page" : undefined} className={tab.active ? "is-active" : undefined} href={tab.href as Route}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
