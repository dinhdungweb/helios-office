"use client";

import { useEffect, useRef, useState } from "react";
import type { SettingsWorkspaceItem } from "@/components/admin/settings-workspace-shell";
import { CaretLeft, GearSix, LinkSimple, List, Users, X } from "@/lib/icons";

const generalSettingsItems = [
  { key: "system", href: "/admin/settings/system", label: "Cài đặt hệ thống" },
  { key: "session", href: "/admin/settings/session", label: "Phiên làm việc" },
  { key: "two-factor", href: "/admin/settings/two-factor", label: "Bảo mật 2 lớp" }
] as const;

export function SettingsMobileNavigation({ activeItem }: { activeItem: SettingsWorkspaceItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="system-settings-mobile-menu">
      <button
        className="icon-button"
        type="button"
        aria-controls="system-settings-mobile-drawer"
        aria-expanded={isOpen}
        aria-label="Mở menu cài đặt"
        onClick={() => setIsOpen(true)}
      >
        <List size={19} weight="duotone" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="system-settings-mobile-layer">
          <button
            className="system-settings-mobile-backdrop"
            type="button"
            aria-label="Đóng menu cài đặt"
            onClick={() => setIsOpen(false)}
          />
          <aside
            className="system-settings-mobile-drawer"
            id="system-settings-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu cài đặt"
          >
            <header>
              <a href="/admin/settings/accounts">
                <CaretLeft size={17} weight="duotone" aria-hidden="true" />
                Quay lại phân hệ
              </a>
              <button
                className="icon-button"
                ref={closeButtonRef}
                type="button"
                aria-label="Đóng menu cài đặt"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} weight="duotone" aria-hidden="true" />
              </button>
            </header>

            <nav className="system-settings-nav" aria-label="Điều hướng cài đặt trên thiết bị di động">
              <section aria-labelledby="mobile-general-settings-group">
                <h2 id="mobile-general-settings-group">
                  <GearSix size={17} weight="duotone" aria-hidden="true" />
                  Cài đặt chung
                </h2>
                <div>
                  {generalSettingsItems.map((item) => {
                    const isCurrent = item.key === activeItem;

                    return (
                      <a
                        className={isCurrent ? "is-current" : undefined}
                        href={item.href}
                        key={item.key}
                        aria-current={isCurrent ? "page" : undefined}
                      >
                        {item.label}
                      </a>
                    );
                  })}
                </div>
              </section>

              <section aria-labelledby="mobile-catalog-settings-group">
                <h2 id="mobile-catalog-settings-group">
                  <GearSix size={17} weight="duotone" aria-hidden="true" />
                  Danh mục
                </h2>
                <div>
                  <a href="/admin/settings/accounts/groups">
                    <Users size={15} weight="duotone" aria-hidden="true" />
                    Nhóm User
                  </a>
                  <a href="/admin/settings/smtp">
                    <LinkSimple size={15} weight="duotone" aria-hidden="true" />
                    Tích hợp ký số
                  </a>
                </div>
              </section>
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
