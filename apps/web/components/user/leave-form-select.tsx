"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretDown } from "@/lib/icons";

export type LeaveFormSelectOption = {
  label: string;
  description?: string;
};

type LeaveFormSelectProps = {
  ariaLabel: string;
  menuLabel: string;
  options: LeaveFormSelectOption[];
  placeholder: string;
};

export function LeaveFormSelect({ ariaLabel, menuLabel, options, placeholder }: LeaveFormSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="leave-reason-select" ref={rootRef}>
      <button
        className={["leave-control", isOpen ? "is-open" : "", selectedOption ? "has-value" : ""].filter(Boolean).join(" ")}
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selectedOption ?? placeholder}</span>
        <CaretDown size={16} weight="duotone" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="leave-reason-menu" id={menuId} role="listbox" aria-label={menuLabel}>
          {options.map((option) => (
            <button
              className="leave-reason-option"
              type="button"
              role="option"
              aria-selected={selectedOption === option.label}
              key={option.label}
              onClick={() => {
                setSelectedOption(option.label);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.description ? <small>{option.description}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
