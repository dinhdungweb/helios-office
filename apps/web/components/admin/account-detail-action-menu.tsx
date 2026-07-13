"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CaretDown,
  Clock,
  FileText,
  MagicWand,
  PencilSimple,
  ShieldCheck
} from "@/lib/icons";

export function AccountDetailActionMenu({ accountId }: { accountId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="admin-account-action-menu-wrap" ref={rootRef}>
      <button
        className={isOpen ? "admin-account-detail-more is-open" : "admin-account-detail-more"}
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Tác vụ khác"
        onClick={() => setIsOpen((current) => !current)}
      >
        <CaretDown size={16} weight="duotone" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="admin-account-action-menu" id={menuId} role="menu">
          <a href={`/admin/settings/accounts/${encodeURIComponent(accountId)}/edit`} role="menuitem" onClick={() => setIsOpen(false)}>
            <PencilSimple size={17} weight="duotone" aria-hidden="true" />
            <span>Sửa</span>
          </a>
          <button className="is-disabled" type="button" role="menuitem" disabled>
            <FileText size={17} weight="duotone" aria-hidden="true" />
            <span>Nhân bản</span>
          </button>
          <button type="button" role="menuitem" onClick={() => setIsOpen(false)}>
            <Clock size={17} weight="duotone" aria-hidden="true" />
            <span>Lịch sử hoạt động</span>
          </button>

          <span className="admin-account-action-menu-separator" aria-hidden="true" />

          <button className="is-disabled" type="button" role="menuitem" disabled>
            <ShieldCheck size={17} weight="duotone" aria-hidden="true" />
            <span>Hướng dẫn sử dụng</span>
          </button>

          <span className="admin-account-action-menu-separator" aria-hidden="true" />

          <button type="button" role="menuitem" onClick={() => setIsOpen(false)}>
            <MagicWand size={17} weight="duotone" aria-hidden="true" />
            <span>Tùy chỉnh</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
