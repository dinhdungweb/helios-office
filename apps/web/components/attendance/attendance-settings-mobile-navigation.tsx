"use client";

import { useEffect, useRef, useState } from "react";
import { ATTENDANCE_SETTINGS_BACK, AttendanceSettingsNav, type AttendanceSettingsItem } from "@/components/attendance/attendance-settings-nav";
import { CaretLeft, List, X } from "@/lib/icons";

// The attendance settings menu as a drawer on narrow screens.
export function AttendanceSettingsMobileNavigation({ activeItem }: { activeItem: AttendanceSettingsItem }) {
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
    const trigger = triggerButtonRef.current;

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
      trigger?.focus();
    };
  }, [isOpen]);

  return (
    <div className="personnel-settings-mobile-menu">
      <button
        aria-controls="attendance-settings-mobile-drawer"
        aria-expanded={isOpen}
        aria-label="Mở menu cài đặt chấm công"
        className="icon-button"
        ref={triggerButtonRef}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <List size={19} weight="duotone" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="personnel-settings-mobile-layer">
          <button aria-label="Đóng menu cài đặt chấm công" className="personnel-settings-mobile-backdrop" type="button" onClick={() => setIsOpen(false)} />
          <aside aria-label="Menu cài đặt chấm công" aria-modal="true" className="personnel-settings-mobile-drawer" id="attendance-settings-mobile-drawer" role="dialog">
            <header>
              <a href={ATTENDANCE_SETTINGS_BACK}>
                <CaretLeft size={17} weight="duotone" aria-hidden="true" />
                Quay lại phân hệ
              </a>
              <button aria-label="Đóng menu cài đặt chấm công" className="icon-button" ref={closeButtonRef} type="button" onClick={() => setIsOpen(false)}>
                <X size={18} weight="duotone" aria-hidden="true" />
              </button>
            </header>
            <AttendanceSettingsNav activeItem={activeItem} idPrefix="attendance-settings-mobile" label="Điều hướng cài đặt chấm công trên thiết bị di động" />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
