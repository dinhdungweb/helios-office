"use client";

import { useState } from "react";
import { Minus, Plus } from "@/lib/icons";

type CollapseButtonProps = {
  className?: string;
  label: string;
  size?: number;
};

const collapseTargetSelector = ".employee-profile-panel, .user-panel, .leave-create-section, .request-detail-panel";

export function CollapseButton({ className = "icon-button", label, size = 16 }: CollapseButtonProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <button
      aria-expanded={!isCollapsed}
      className={className}
      type="button"
      aria-label={`${isCollapsed ? "Mở rộng" : "Thu gọn"} ${label}`}
      onClick={(event) => {
        const panel = event.currentTarget.closest(collapseTargetSelector);
        panel?.classList.toggle("is-collapsed");
        setIsCollapsed((current) => !current);
      }}
    >
      {isCollapsed ? (
        <Plus size={size} weight="duotone" aria-hidden="true" />
      ) : (
        <Minus size={size} weight="duotone" aria-hidden="true" />
      )}
    </button>
  );
}
