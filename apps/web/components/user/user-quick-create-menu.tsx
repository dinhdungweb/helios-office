"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretRight, Plus } from "@/lib/icons";

type UserQuickCreateMode = "default" | "admin";

const requestCreateItems = [
  { label: "Đơn xin nghỉ", href: "/user/requests/new?type=leave" },
  { label: "Đơn vắng mặt", href: "/user/requests/new?type=absence" },
  { label: "Đơn làm thêm", href: "/user/requests/new?type=overtime" },
  { label: "Đơn checkin/out", href: "/user/requests/new?type=checkin-out" },
  { label: "Đơn đổi ca", href: "/user/requests/new?type=shift-change" },
  { label: "Đơn thôi việc", href: "/user/requests/new?type=resignation" }
];

const adminShortcutItems = [
  { label: "Phòng ban, chi nhánh", href: "/admin/settings/org-chart" },
  { label: "Khối nghiệp vụ", href: "/admin/settings/positions-titles" },
  { label: "Loại phòng ban", href: "/admin/settings/org-chart" },
  { label: "Nhóm người dùng", href: "/admin/settings/accounts/groups" },
  { label: "Quản lý tiền tệ", href: "/admin/settings#system-settings" },
  { label: "Cấu hình SSO", href: "/admin/settings#system-settings" },
  { label: "BÁO CÁO TÌNH HÌNH SỬ DỤNG CỦA NGƯỜI DÙNG THÁNG 07/2026", href: "/admin/settings#audit-logs" }
];

type UserQuickCreateMenuProps = {
  mode?: UserQuickCreateMode;
};

export function UserQuickCreateMenu({ mode = "default" }: UserQuickCreateMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<"requests" | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const isAdminMode = mode === "admin";

  useEffect(() => {
    if (!isOpen) {
      setActiveGroup(null);
      return;
    }

    firstItemRef.current?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveGroup(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setActiveGroup(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="user-quick-create-wrap" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={isAdminMode ? "Mở menu cấu hình nhanh" : "Tạo nhanh"}
        className={isAdminMode ? "icon-button user-quick-create is-admin-mode" : "icon-button user-quick-create"}
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
          setActiveGroup(null);
        }}
      >
        <Plus size={19} weight="duotone" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          className={[
            "user-quick-create-popover",
            activeGroup ? "is-nested" : "",
            isAdminMode ? "is-admin-menu" : ""
          ].filter(Boolean).join(" ")}
          id={menuId}
          role="menu"
          aria-label={isAdminMode ? "Cấu hình nhanh" : "Tạo nhanh"}
        >
          {isAdminMode ? (
            <div className="user-quick-create-column">
              {adminShortcutItems.map((item, index) => (
                <a
                  className="user-quick-create-item"
                  href={item.href}
                  key={item.label}
                  ref={index === 0 ? (node) => {
                    firstItemRef.current = node;
                  } : undefined}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ) : (
            <>
              <div className="user-quick-create-column">
                <button
                  aria-expanded={activeGroup === "requests"}
                  aria-haspopup="menu"
                  className={activeGroup === "requests" ? "user-quick-create-item is-active" : "user-quick-create-item"}
                  ref={(node) => {
                    firstItemRef.current = node;
                  }}
                  role="menuitem"
                  type="button"
                  onClick={() => setActiveGroup("requests")}
                  onMouseEnter={() => setActiveGroup("requests")}
                >
                  <span>Đơn từ</span>
                  <CaretRight size={15} weight="duotone" aria-hidden="true" />
                </button>
              </div>

              {activeGroup === "requests" ? (
                <div className="user-quick-create-column" role="menu" aria-label="Đơn từ">
                  {requestCreateItems.map((item) => (
                    <a className="user-quick-create-item" href={item.href} key={item.label} role="menuitem" onClick={() => setIsOpen(false)}>
                      {item.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
