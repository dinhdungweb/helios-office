"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FormSelect, FormSwitch, type FormSelectOption } from "@/components/ui/form-controls";
import { CaretDown, WarningCircle, X } from "@/lib/icons";

type CurrencyCreateSectionKey = "general" | "display";

const currencyOptions: FormSelectOption[] = [
  { label: "VND - Việt Nam đồng", value: "VND" },
  { label: "USD - US Dollar", value: "USD" },
  { label: "EUR - Euro", value: "EUR" },
  { label: "JPY - Japanese Yen", value: "JPY" },
  { label: "THB - Thai Baht", value: "THB" }
];

const displayPositionOptions: FormSelectOption[] = [
  { label: "Trước chữ số", value: "before" },
  { label: "Sau chữ số", value: "after" }
];

const symbolOptions: FormSelectOption[] = [
  { label: "Biểu tượng", value: "symbol" },
  { label: "Mã tiền tệ", value: "code" },
  { label: "Tên đầy đủ", value: "name" }
];

const decimalOptions: FormSelectOption[] = [
  { label: "0", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" }
];

const formatPatternOptions = [
  "123,456,789.12",
  "123.456.789,12",
  "123 456 789.12",
  "123 456 789,12"
];
const defaultFormatPattern = formatPatternOptions[0] ?? "";

function CurrencyField({
  children,
  help,
  isFilled,
  label,
  required
}: {
  children: ReactNode;
  help?: boolean;
  isFilled?: boolean;
  label: string;
  required?: boolean;
}) {
  return (
    <div className={isFilled ? "currency-create-field is-filled" : "currency-create-field"}>
      <span className="currency-create-field-label">
        {help ? <WarningCircle size={13} weight="duotone" aria-hidden="true" /> : null}
        {label}
        {required ? <em aria-hidden="true">*</em> : null}
      </span>
      {children}
    </div>
  );
}

function ClearableInput({
  name,
  onChange,
  placeholder,
  required,
  type = "text",
  value
}: {
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <div className="currency-create-input-wrap">
      <input
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
      {value ? (
        <button type="button" aria-label={`Xóa ${placeholder}`} onClick={() => onChange("")}>
          <X size={16} weight="duotone" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function FormatPatternInput({
  onChange,
  value
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
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
    <div className="currency-create-input-wrap currency-format-control" ref={rootRef}>
      <input
        aria-controls="currency-format-menu"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        name="formatPattern"
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Định dạng"
        required
        type="text"
        value={value}
      />
      {value ? (
        <button type="button" aria-label="Xóa định dạng" onClick={() => onChange("")}>
          <X size={16} weight="duotone" aria-hidden="true" />
        </button>
      ) : null}

      {isOpen ? (
        <div className="currency-format-menu" id="currency-format-menu" role="listbox" aria-label="Chọn định dạng tiền tệ">
          {formatPatternOptions.map((option) => (
            <button
              className={option === value ? "is-selected" : undefined}
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CurrencyCreateBoard() {
  const [collapsedSections, setCollapsedSections] = useState<Set<CurrencyCreateSectionKey>>(() => new Set());
  const [currencyCode, setCurrencyCode] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [displayPosition, setDisplayPosition] = useState("before");
  const [symbolDisplay, setSymbolDisplay] = useState("symbol");
  const [decimalPlaces, setDecimalPlaces] = useState("");
  const [formatPattern, setFormatPattern] = useState(defaultFormatPattern);
  const [isPrimaryCurrency, setIsPrimaryCurrency] = useState(false);
  const [autoUpdateRate, setAutoUpdateRate] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  function isSectionCollapsed(section: CurrencyCreateSectionKey) {
    return collapsedSections.has(section);
  }

  function toggleSection(section: CurrencyCreateSectionKey) {
    setCollapsedSections((current) => {
      const next = new Set(current);

      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }

      return next;
    });
  }

  const isGeneralCollapsed = isSectionCollapsed("general");
  const isDisplayCollapsed = isSectionCollapsed("display");

  return (
    <main className="currency-create-page" aria-label="Thêm mới tiền tệ">
      <form
        className="currency-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          setStatusMessage("Đã cập nhật cấu hình tiền tệ.");
        }}
      >
        <section className={isGeneralCollapsed ? "currency-create-section is-collapsed" : "currency-create-section"} aria-labelledby="currency-general-title">
          <header className="currency-create-section-header">
            <h2 id="currency-general-title">
              <button
                className="currency-create-section-toggle"
                type="button"
                aria-controls="currency-general-body"
                aria-expanded={!isGeneralCollapsed}
                onClick={() => toggleSection("general")}
              >
                <CaretDown size={17} weight="duotone" aria-hidden="true" />
                <span>Thông tin chung</span>
              </button>
            </h2>
          </header>

          <div className="currency-create-section-body" id="currency-general-body" hidden={isGeneralCollapsed}>
            <div className="currency-create-grid">
              <CurrencyField isFilled={Boolean(currencyCode)} label="Loại tiền" required>
                <FormSelect
                  ariaLabel="Loại tiền"
                  className="currency-create-select"
                  menuLabel="Loại tiền"
                  name="currencyCode"
                  onValueChange={setCurrencyCode}
                  options={currencyOptions}
                  placeholder="Loại tiền"
                  required
                />
              </CurrencyField>
              <CurrencyField isFilled={Boolean(exchangeRate)} label="Tỉ giá" required help>
                <ClearableInput
                  name="exchangeRate"
                  onChange={setExchangeRate}
                  placeholder="Tỉ giá"
                  required
                  type="number"
                  value={exchangeRate}
                />
              </CurrencyField>
            </div>

            <div className="currency-create-switch-list">
              <FormSwitch
                checked={isPrimaryCurrency}
                label="Tiền tệ chính"
                name="isPrimaryCurrency"
                onChange={(event) => setIsPrimaryCurrency(event.currentTarget.checked)}
              />
              <FormSwitch
                checked={autoUpdateRate}
                label="Cập nhật tỉ giá tự động"
                name="autoUpdateRate"
                onChange={(event) => setAutoUpdateRate(event.currentTarget.checked)}
              />
            </div>
          </div>
        </section>

        <section className={isDisplayCollapsed ? "currency-create-section is-collapsed" : "currency-create-section"} aria-labelledby="currency-display-title">
          <header className="currency-create-section-header">
            <h2 id="currency-display-title">
              <button
                className="currency-create-section-toggle"
                type="button"
                aria-controls="currency-display-body"
                aria-expanded={!isDisplayCollapsed}
                onClick={() => toggleSection("display")}
              >
                <CaretDown size={17} weight="duotone" aria-hidden="true" />
                <span>Hiển thị</span>
              </button>
            </h2>
          </header>

          <div className="currency-create-section-body" id="currency-display-body" hidden={isDisplayCollapsed}>
            <div className="currency-create-grid">
              <CurrencyField isFilled={Boolean(formatPattern)} label="Định dạng" required>
                <FormatPatternInput onChange={setFormatPattern} value={formatPattern} />
              </CurrencyField>
              <CurrencyField isFilled={Boolean(displayPosition)} label="Vị trí hiển thị" required>
                <FormSelect
                  ariaLabel="Vị trí hiển thị"
                  className="currency-create-select"
                  defaultValue="before"
                  menuLabel="Vị trí hiển thị"
                  name="displayPosition"
                  onValueChange={setDisplayPosition}
                  options={displayPositionOptions}
                  placeholder="Vị trí hiển thị"
                  required
                />
              </CurrencyField>
              <CurrencyField isFilled={Boolean(symbolDisplay)} label="Biểu tượng" required>
                <FormSelect
                  ariaLabel="Biểu tượng"
                  className="currency-create-select"
                  defaultValue="symbol"
                  menuLabel="Biểu tượng"
                  name="symbolDisplay"
                  onValueChange={setSymbolDisplay}
                  options={symbolOptions}
                  placeholder="Biểu tượng"
                  required
                />
              </CurrencyField>
              <CurrencyField isFilled={Boolean(decimalPlaces)} label="Số dấu thập phân" help>
                <FormSelect
                  ariaLabel="Số dấu thập phân"
                  className="currency-create-select"
                  menuLabel="Số dấu thập phân"
                  name="decimalPlaces"
                  onValueChange={setDecimalPlaces}
                  options={decimalOptions}
                  placeholder="Số dấu thập phân"
                />
              </CurrencyField>
            </div>
          </div>
        </section>

        {statusMessage ? <p className="currency-create-status" role="status">{statusMessage}</p> : null}

        <footer className="currency-create-footer">
          <button className="primary-button" type="submit">
            CẬP NHẬT
          </button>
          <a className="secondary-button" href="/admin/settings">
            HỦY BỎ
          </a>
        </footer>
      </form>
    </main>
  );
}
