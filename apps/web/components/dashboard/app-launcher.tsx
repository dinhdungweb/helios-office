"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useId, useRef, useState } from "react";
import {
  BookOpenText,
  Briefcase,
  CalendarBlank,
  CheckCircle,
  ClipboardText,
  CurrencyDollar,
  FileText,
  GlobeHemisphereWest,
  GraduationCap,
  MagnifyingGlass,
  MoneyWavy,
  Package,
  SealCheck,
  SquaresFour,
  Target,
  Umbrella,
  Users,
  UsersThree,
  X
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

type LauncherItem = {
  label: string;
  icon: Icon;
  tone: "blue" | "green" | "orange" | "purple" | "red";
  href?: Route;
};

type LauncherSection = {
  title?: string;
  items: LauncherItem[];
};

const launcherSections: LauncherSection[] = [
  {
    title: "Văn phòng",
    items: [
      { label: "Mạng nội bộ", icon: GlobeHemisphereWest, tone: "blue", href: "/social" },
      { label: "Công việc", icon: ClipboardText, tone: "green" },
      { label: "Dự án", icon: Briefcase, tone: "orange" },
      { label: "Quy trình", icon: SquaresFour, tone: "purple" },
      { label: "Tài liệu", icon: BookOpenText, tone: "red" },
      { label: "Ký số", icon: SealCheck, tone: "blue" },
      { label: "Lịch biểu", icon: CalendarBlank, tone: "red" },
      { label: "Văn bản", icon: FileText, tone: "orange" },
      { label: "Tài sản", icon: Package, tone: "green" }
    ]
  },
  {
    title: "HRM",
    items: [
      { label: "Đơn từ", icon: ClipboardText, tone: "blue" },
      { label: "Tuyển dụng", icon: UsersThree, tone: "red" },
      { label: "Nhân sự", icon: Users, tone: "green" },
      { label: "Đánh giá", icon: FileText, tone: "orange" },
      { label: "IVAN", icon: Umbrella, tone: "purple" },
      { label: "Đào tạo", icon: GraduationCap, tone: "red" },
      { label: "Chấm công", icon: CheckCircle, tone: "blue" },
      { label: "Bảng lương", icon: CurrencyDollar, tone: "red" },
      { label: "Ứng lương", icon: MoneyWavy, tone: "green" },
      { label: "KPI", icon: Target, tone: "green" },
      { label: "OKR", icon: Target, tone: "orange" }
    ]
  },
  {
    title: "CRM",
    items: []
  }
];

export function AppLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const firstItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstItemRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Mở bảng chức năng"
        className="icon-button"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <SquaresFour size={19} weight="duotone" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="launcher-layer" role="presentation">
          <button
            className="launcher-backdrop"
            type="button"
            aria-label="Đóng bảng chức năng"
            onClick={() => setIsOpen(false)}
          />
          <aside
            aria-label="Bảng chức năng"
            aria-modal="true"
            className="launcher-panel"
            id={panelId}
            role="dialog"
          >
            <header className="launcher-header">
              <div className="launcher-brand" aria-label="Helios Office">
                <span>H</span>
                <strong>Helios Office</strong>
              </div>
              <div className="launcher-header-actions">
                <button className="icon-button" type="button" aria-label="Tìm chức năng">
                  <MagnifyingGlass size={19} weight="duotone" aria-hidden="true" />
                </button>
                <button className="icon-button" type="button" aria-label="Đóng bảng chức năng" onClick={() => setIsOpen(false)}>
                  <X size={18} weight="duotone" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="launcher-content">
              {launcherSections.map((section, sectionIndex) => (
                <section className="launcher-section" key={section.title ?? "main"}>
                  {section.title ? <h2>{section.title}</h2> : null}
                  {section.items.length > 0 ? (
                    <div className="launcher-grid">
                      {section.items.map((item, itemIndex) => {
                        const isFirstItem = sectionIndex === 0 && itemIndex === 0;
                        const itemContent = (
                          <>
                            <span className={`launcher-icon launcher-icon--${item.tone}`}>
                              <item.icon size={25} weight="duotone" aria-hidden="true" />
                            </span>
                            <span>{item.label}</span>
                          </>
                        );

                        return item.href ? (
                          <Link
                            className="launcher-item"
                            href={item.href}
                            key={item.label}
                            onClick={() => setIsOpen(false)}
                            ref={isFirstItem ? firstItemRef : undefined}
                          >
                            {itemContent}
                          </Link>
                        ) : (
                          <button className="launcher-item" key={item.label} type="button">
                            {itemContent}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
