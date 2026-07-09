"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";

const requestCreateItems = [
  { label: "Đơn xin nghỉ", href: "/user/requests/new?type=leave" },
  { label: "Đơn vắng mặt", href: "/user/requests/new?type=absence" },
  { label: "Đơn làm thêm", href: "/user/requests/new?type=overtime" },
  { label: "Đơn checkin/out", href: "/user/requests/new?type=checkin-out" },
  { label: "Đơn đổi ca", href: "/user/requests/new?type=shift-change" },
  { label: "Đơn thôi việc", href: "/user/requests/new?type=resignation" }
];

export function UserQuickCreateMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<"requests" | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);

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
        aria-label="Tạo nhanh"
        className="icon-button user-quick-create"
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
          className={activeGroup ? "user-quick-create-popover is-nested" : "user-quick-create-popover"}
          id={menuId}
          role="menu"
          aria-label="Tạo nhanh"
        >
          <div className="user-quick-create-column">
            <button
              aria-expanded={activeGroup === "requests"}
              aria-haspopup="menu"
              className={activeGroup === "requests" ? "user-quick-create-item is-active" : "user-quick-create-item"}
              ref={firstItemRef}
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
        </div>
      ) : null}
    </div>
  );
}
