"use client";

import { useEffect, useRef, useState } from "react";
import type { PersonnelSettingsItem } from "@/components/admin/personnel-settings-workspace-shell";
import { CaretDown, CaretLeft, CaretRight, GearSix, List, Package, X } from "@/lib/icons";

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

export function PersonnelSettingsMobileNavigation({ activeItem }: { activeItem: PersonnelSettingsItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth > 900) setIsOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
      triggerButtonRef.current?.focus();
    };
  }, [isOpen]);

  return (
    <div className="personnel-settings-mobile-menu">
      <button
        className="icon-button"
        ref={triggerButtonRef}
        type="button"
        aria-controls="personnel-settings-mobile-drawer"
        aria-expanded={isOpen}
        aria-label="Mở menu cài đặt nhân sự"
        onClick={() => setIsOpen(true)}
      >
        <List size={19} weight="duotone" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="personnel-settings-mobile-layer">
          <button
            className="personnel-settings-mobile-backdrop"
            type="button"
            aria-label="Đóng menu cài đặt nhân sự"
            onClick={() => setIsOpen(false)}
          />
          <aside
            className="personnel-settings-mobile-drawer"
            id="personnel-settings-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu cài đặt nhân sự"
          >
            <header>
              <a href="/apps/personnel-profile-profile">
                <CaretLeft size={17} weight="duotone" aria-hidden="true" />
                Quay lại phân hệ
              </a>
              <button
                className="icon-button"
                ref={closeButtonRef}
                type="button"
                aria-label="Đóng menu cài đặt nhân sự"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} weight="duotone" aria-hidden="true" />
              </button>
            </header>

            <nav className="personnel-settings-nav" aria-label="Điều hướng cài đặt nhân sự trên thiết bị di động">
              <section aria-labelledby="personnel-mobile-general-settings-group">
                <h2 id="personnel-mobile-general-settings-group">
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

              <section aria-labelledby="personnel-mobile-object-settings-group">
                <h2 id="personnel-mobile-object-settings-group">
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
          </aside>
        </div>
      ) : null}
    </div>
  );
}
