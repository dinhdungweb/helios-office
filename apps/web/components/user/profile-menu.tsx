"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  BookOpenText,
  Briefcase,
  CaretRight,
  IdentificationBadge,
  Key,
  Language,
  Logout,
  MagicWand
} from "@/lib/icons";
import type { UserProfile } from "@/lib/mock-data";

type ProfileMenuProps = {
  user: UserProfile;
};

export function ProfileMenu({ user }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
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
    <div className="user-profile-menu-wrap" ref={menuRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="avatar-button"
        type="button"
        aria-label={`Mở menu hồ sơ ${user.name}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{user.avatar}</span>
      </button>

      {isOpen ? (
        <div className="user-profile-menu" id={menuId} role="menu">
          <header className="user-profile-menu-header">
            <span className="user-profile-menu-avatar">{user.avatar}</span>
            <div>
              <h2>{user.name}</h2>
              <p>
                <Briefcase size={15} weight="duotone" aria-hidden="true" />
                {user.department}
              </p>
              <p>
                <IdentificationBadge size={15} weight="duotone" aria-hidden="true" />
                {user.title}
              </p>
            </div>
          </header>

          <div className="user-profile-menu-section">
            <a href="/user?customMenu=user-board-profile" role="menuitem">
              <IdentificationBadge size={18} weight="duotone" aria-hidden="true" />
              <span>Tài khoản</span>
            </a>
            <button type="button" role="menuitem">
              <BookOpenText size={18} weight="duotone" aria-hidden="true" />
              <span>Hướng dẫn sử dụng</span>
            </button>
            <button type="button" role="menuitem">
              <MagicWand size={18} weight="duotone" aria-hidden="true" />
              <span>Màu giao diện</span>
              <span className="theme-preview" aria-hidden="true" />
            </button>
            <button type="button" role="menuitem">
              <Language size={18} weight="duotone" aria-hidden="true" />
              <span>Ngôn ngữ</span>
              <span className="user-profile-menu-value">VN</span>
              <CaretRight size={14} weight="duotone" aria-hidden="true" />
            </button>
          </div>

          <div className="user-profile-menu-section">
            <button type="button" role="menuitem">
              <Key size={18} weight="duotone" aria-hidden="true" />
              <span>Đổi mật khẩu</span>
            </button>
            <button className="is-danger" type="button" role="menuitem">
              <Logout size={18} weight="duotone" aria-hidden="true" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
