"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  Bank,
  BookOpenText,
  Briefcase,
  CaretRight,
  Check,
  GearSix,
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

type ThemeColor = {
  id: string;
  label: string;
  primary: string;
  strong: string;
  soft: string;
  border: string;
};

const appearancePreferenceScope = "appearance.theme";
const appearanceStorageKeyPrefix = "helios:appearance-theme";
const appearanceGlobalStorageKey = `${appearanceStorageKeyPrefix}:current`;

const themeColors: ThemeColor[] = [
  { id: "orange", label: "Cam", primary: "#f15a24", strong: "#d94918", soft: "#fff0ea", border: "#ffd7cb" },
  { id: "red", label: "Đỏ", primary: "#ef4444", strong: "#dc2626", soft: "#fef2f2", border: "#fecaca" },
  { id: "rose", label: "Hồng", primary: "#e11d48", strong: "#be123c", soft: "#fff1f2", border: "#fecdd3" },
  { id: "amber", label: "Vàng", primary: "#f59e0b", strong: "#d97706", soft: "#fffbeb", border: "#fde68a" },
  { id: "emerald", label: "Xanh lá", primary: "#10b981", strong: "#059669", soft: "#ecfdf5", border: "#a7f3d0" },
  { id: "cyan", label: "Xanh cyan", primary: "#06b6d4", strong: "#0891b2", soft: "#ecfeff", border: "#a5f3fc" },
  { id: "blue", label: "Xanh dương", primary: "#2563eb", strong: "#1d4ed8", soft: "#eff6ff", border: "#bfdbfe" },
  { id: "violet", label: "Tím", primary: "#7c3aed", strong: "#6d28d9", soft: "#f5f3ff", border: "#ddd6fe" },
  { id: "slate", label: "Đen", primary: "#30363d", strong: "#1f2328", soft: "#f3f4f6", border: "#d1d5db" }
];

function getThemeColor(themeId: string | null | undefined) {
  return themeColors.find((theme) => theme.id === themeId) ?? themeColors[0];
}

function applyThemeColor(theme: ThemeColor) {
  const root = document.documentElement;

  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-primary-strong", theme.strong);
  root.style.setProperty("--color-primary-soft", theme.soft);
  root.style.setProperty("--color-primary-border", theme.border);
  root.style.setProperty("--color-primary-contrast", "#ffffff");
  root.style.setProperty("--app-loading-color", theme.primary);
}

function readPreferenceTheme(value: unknown) {
  if (!value || typeof value !== "object" || !("themeId" in value)) {
    return null;
  }

  const themeId = (value as { themeId?: unknown }).themeId;

  return typeof themeId === "string" ? themeId : null;
}

async function fetchThemePreference() {
  const response = await fetch(`/api/user-preferences/${encodeURIComponent(appearancePreferenceScope)}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Theme preference read returned ${response.status}`);
  }

  return response.json() as Promise<{ value: unknown }>;
}

async function saveThemePreference(themeId: string) {
  const response = await fetch(`/api/user-preferences/${encodeURIComponent(appearancePreferenceScope)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ value: { themeId } })
  });

  if (!response.ok) {
    throw new Error(`Theme preference update returned ${response.status}`);
  }
}

export function ProfileMenu({ user }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState(themeColors[0].id);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedTheme = getThemeColor(selectedThemeId);
  const appearanceStorageKey = `${appearanceStorageKeyPrefix}:${user.name}:${user.department}`;

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

  useEffect(() => {
    let isActive = true;

    try {
      const storedTheme = window.localStorage.getItem(appearanceStorageKey);
      const localTheme = getThemeColor(storedTheme);

      setSelectedThemeId(localTheme.id);
      applyThemeColor(localTheme);
    } catch {
      applyThemeColor(themeColors[0]);
    }

    fetchThemePreference()
      .then((preference) => {
        if (!isActive) {
          return;
        }

        const preferenceThemeId = readPreferenceTheme(preference.value);

        if (!preferenceThemeId) {
          return;
        }

        const preferenceTheme = getThemeColor(preferenceThemeId);
        setSelectedThemeId(preferenceTheme.id);
        applyThemeColor(preferenceTheme);

        try {
          window.localStorage.setItem(appearanceStorageKey, preferenceTheme.id);
          window.localStorage.setItem(appearanceGlobalStorageKey, preferenceTheme.id);
        } catch {
          // Local storage is best-effort.
        }
      })
      .catch(() => {
        // The local theme keeps the UI stable if the preference API is unavailable.
      });

    return () => {
      isActive = false;
    };
  }, []);

  const chooseTheme = (theme: ThemeColor) => {
    setSelectedThemeId(theme.id);
    applyThemeColor(theme);

    try {
      window.localStorage.setItem(appearanceStorageKey, theme.id);
      window.localStorage.setItem(appearanceGlobalStorageKey, theme.id);
    } catch {
      // Local storage is best-effort.
    }

    void saveThemePreference(theme.id).catch(() => undefined);
  };

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
            <a href="/admin/settings" role="menuitem">
              <GearSix size={18} weight="duotone" aria-hidden="true" />
              <span>Cài đặt hệ thống</span>
            </a>
            <a href="/admin/settings#reconciliation" role="menuitem">
              <Bank size={18} weight="duotone" aria-hidden="true" />
              <span>Thông tin đối soát</span>
            </a>
            <button type="button" role="menuitem">
              <BookOpenText size={18} weight="duotone" aria-hidden="true" />
              <span>Hướng dẫn sử dụng</span>
            </button>
            <div className="theme-menu-item-wrap">
              <button
                type="button"
                role="menuitem"
                aria-expanded={isThemeOpen}
                onClick={() => setIsThemeOpen((current) => !current)}
              >
                <MagicWand size={18} weight="duotone" aria-hidden="true" />
                <span>Màu giao diện</span>
                <span className="theme-preview" style={{ "--theme-color": selectedTheme.primary } as CSSProperties} aria-hidden="true" />
              </button>
              {isThemeOpen ? (
                <div className="theme-color-grid" role="group" aria-label="Chọn màu giao diện">
                  {themeColors.map((theme) => {
                    const isSelected = theme.id === selectedThemeId;

                    return (
                      <button
                        className={isSelected ? "theme-color-swatch is-selected" : "theme-color-swatch"}
                        key={theme.id}
                        type="button"
                        aria-label={`Chọn màu ${theme.label}`}
                        aria-pressed={isSelected}
                        style={{ "--theme-color": theme.primary } as CSSProperties}
                        onClick={() => chooseTheme(theme)}
                      >
                        <span aria-hidden="true" />
                        {isSelected ? <Check size={18} weight="duotone" aria-hidden="true" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
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
            <a className="is-danger" href="/api/auth/logout" role="menuitem">
              <Logout size={18} weight="duotone" aria-hidden="true" />
              <span>Đăng xuất</span>
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
