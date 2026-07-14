"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { DotsThreeVertical } from "@/lib/icons";

export type ResponsiveToolbarAction = {
  href?: string;
  icon: ReactNode;
  key: string;
  label: string;
  onClick?: () => void;
};

type ResponsiveToolbarActionMenuProps = {
  actions: ResponsiveToolbarAction[];
  ariaLabel: string;
  inlineClassName?: string;
};

export function ResponsiveToolbarActionMenu({
  actions,
  ariaLabel,
  inlineClassName = "admin-user-toolbar-actions"
}: ResponsiveToolbarActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const runAction = (action: ResponsiveToolbarAction) => {
    action.onClick?.();
    setIsOpen(false);
  };

  return (
    <>
      <div className={inlineClassName}>
        {actions.map((action) =>
          action.href ? (
            <a href={action.href} key={action.key}>
              {action.icon}
              <span>{action.label}</span>
            </a>
          ) : (
            <button type="button" key={action.key} onClick={() => action.onClick?.()}>
              {action.icon}
              <span>{action.label}</span>
            </button>
          )
        )}
      </div>

      <div className="admin-toolbar-action-menu-wrap" ref={rootRef}>
        <button
          className="admin-toolbar-action-trigger"
          type="button"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          onClick={() => setIsOpen((current) => !current)}
        >
          <DotsThreeVertical size={18} weight="duotone" aria-hidden="true" />
        </button>

        {isOpen ? (
          <div className="admin-toolbar-mobile-action-menu" role="menu">
            {actions.map((action) =>
              action.href ? (
                <a href={action.href} key={action.key} role="menuitem" onClick={() => runAction(action)}>
                  {action.icon}
                  <span>{action.label}</span>
                </a>
              ) : (
                <button type="button" key={action.key} role="menuitem" onClick={() => runAction(action)}>
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              )
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
