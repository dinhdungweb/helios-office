"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode
} from "react";
import { CalendarBlank, CaretDown, Check } from "@/lib/icons";

export type FormSelectOption = {
  label: string;
  description?: string;
  value?: string;
};

type FormSelectProps = {
  ariaLabel: string;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  menuLabel: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: FormSelectOption[];
  placeholder: string;
  required?: boolean;
};

type FormDatePickerProps = {
  defaultValue?: string;
  disabled?: boolean;
  name: string;
  placeholder: string;
  required?: boolean;
};

type FormCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  className?: string;
  label: ReactNode;
};

type FormSwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  className?: string;
  label: ReactNode;
};

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function getOptionValue(option: FormSelectOption) {
  return option.value ?? option.label;
}

function joinClassNames(...classNames: Array<string | false | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateValue(value?: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatDateLabel(value: string) {
  const date = parseDateValue(value);

  if (!date) {
    return "";
  }

  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function getCalendarCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const leadingEmptyCells = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return [
    ...Array.from({ length: leadingEmptyCells }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];
}

export function FormSelect({
  ariaLabel,
  className,
  defaultValue,
  disabled = false,
  menuLabel,
  name,
  onValueChange,
  options,
  placeholder,
  required = false
}: FormSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const [selectedValue, setSelectedValue] = useState(defaultValue ?? "");
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => getOptionValue(option) === selectedValue);

  function toggleMenu() {
    setIsOpen((current) => {
      const willOpen = !current;

      if (willOpen) {
        const rect = rootRef.current?.getBoundingClientRect();

        if (rect) {
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          setPlacement(spaceBelow < 260 && spaceAbove > spaceBelow ? "above" : "below");
        }
      }

      return willOpen;
    });
  }

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
    <div className={joinClassNames("form-select", "leave-reason-select", className)} ref={rootRef}>
      {name ? <input name={name} type="hidden" value={selectedValue} disabled={disabled} /> : null}
      <button
        className={joinClassNames("form-control", "leave-control", isOpen && "is-open", `is-${placement}`, selectedOption && "has-value")}
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-required={required}
        disabled={disabled}
        onClick={toggleMenu}
      >
        <span>{selectedOption?.label ?? placeholder}</span>
        <CaretDown size={16} weight="duotone" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className={joinClassNames("form-select-menu", "leave-reason-menu", `is-${placement}`)} id={menuId} role="listbox" aria-label={menuLabel}>
          {options.map((option) => (
            <button
              className="form-select-option leave-reason-option"
              type="button"
              role="option"
              aria-selected={selectedValue === getOptionValue(option)}
              key={getOptionValue(option)}
              onClick={() => {
                const nextValue = getOptionValue(option);
                setSelectedValue(nextValue);
                onValueChange?.(nextValue);
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

export function FormDatePicker({ defaultValue = "", disabled = false, name, placeholder, required = false }: FormDatePickerProps) {
  const initialDate = parseDateValue(defaultValue) ?? new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [viewDate, setViewDate] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = parseDateValue(selectedValue);
  const cells = useMemo(() => getCalendarCells(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);

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

  function toggleMenu() {
    setIsOpen((current) => {
      const willOpen = !current;

      if (willOpen) {
        const rect = rootRef.current?.getBoundingClientRect();

        if (rect) {
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          setPlacement(spaceBelow < 320 && spaceAbove > spaceBelow ? "above" : "below");
        }
      }

      return willOpen;
    });
  }

  return (
    <div className="form-date-picker employee-date-picker" ref={rootRef}>
      <input name={name} type="hidden" value={selectedValue} disabled={disabled} />
      <button
        className={joinClassNames(
          "form-control",
          "leave-control",
          "form-date-button",
          "employee-date-button",
          isOpen && "is-open",
          `is-${placement}`,
          selectedValue && "has-value"
        )}
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={placeholder}
        aria-required={required}
        disabled={disabled}
        onClick={toggleMenu}
      >
        <CalendarBlank size={16} weight="duotone" aria-hidden="true" />
        <span>{selectedValue ? formatDateLabel(selectedValue) : placeholder}</span>
        <CaretDown size={14} weight="duotone" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className={joinClassNames("form-date-menu", "employee-date-menu", `is-${placement}`)} id={menuId} role="dialog" aria-label={placeholder}>
          <header>
            <button type="button" aria-label="Tháng trước" onClick={() => setViewDate((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}>
              <CaretDown size={18} weight="duotone" aria-hidden="true" />
            </button>
            <strong>{String(viewDate.getMonth() + 1).padStart(2, "0")}/{viewDate.getFullYear()}</strong>
            <button type="button" aria-label="Tháng sau" onClick={() => setViewDate((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}>
              <CaretDown size={18} weight="duotone" aria-hidden="true" />
            </button>
          </header>

          <div className="form-date-weekdays employee-date-weekdays" aria-hidden="true">
            {weekdays.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="form-date-grid employee-date-grid">
            {cells.map((day, index) => {
              const isSelected =
                Boolean(day) &&
                selectedDate?.getFullYear() === viewDate.getFullYear() &&
                selectedDate.getMonth() === viewDate.getMonth() &&
                selectedDate.getDate() === day;

              return day ? (
                <button
                  className={isSelected ? "is-active" : undefined}
                  type="button"
                  key={`${viewDate.getFullYear()}-${viewDate.getMonth()}-${day}`}
                  onClick={() => {
                    setSelectedValue(formatDateInputValue(new Date(viewDate.getFullYear(), viewDate.getMonth(), day)));
                    setIsOpen(false);
                  }}
                >
                  {day}
                </button>
              ) : (
                <span key={`empty-${index}`} aria-hidden="true" />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FormCheckbox({ className, label, ...inputProps }: FormCheckboxProps) {
  return (
    <label className={joinClassNames("form-checkbox", className)}>
      <input {...inputProps} type="checkbox" />
      <span className="form-checkbox-box" aria-hidden="true">
        <Check size={13} weight="duotone" />
      </span>
      <span className="form-checkbox-label">{label}</span>
    </label>
  );
}

export function FormSwitch({ className, label, ...inputProps }: FormSwitchProps) {
  return (
    <label className={joinClassNames("form-switch", className)}>
      <input {...inputProps} type="checkbox" />
      <span className="form-switch-track" aria-hidden="true" />
      <span className="form-switch-label">{label}</span>
    </label>
  );
}
