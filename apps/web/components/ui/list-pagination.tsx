"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, CaretLeft, CaretRight } from "@/lib/icons";

type ListPaginationProps = {
  ariaLabel?: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageCount: number;
};

export function ListPagination({
  ariaLabel = "Chọn trang",
  currentPage,
  onPageChange,
  pageCount
}: ListPaginationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const safePageCount = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(currentPage, 1), safePageCount);
  const pageNumbers = useMemo(
    () => Array.from({ length: safePageCount }, (_, index) => index + 1),
    [safePageCount]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
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

  return (
    <>
      <div className="list-pagination-picker" ref={pickerRef}>
        <button
          className={isOpen ? "list-pagination-trigger is-active" : "list-pagination-trigger"}
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span>Trang: {String(safePage).padStart(2, "0")} / {String(safePageCount).padStart(2, "0")}</span>
          <CaretDown size={16} weight="duotone" aria-hidden="true" />
        </button>
        {isOpen ? (
          <div className="list-pagination-menu" role="listbox" aria-label={ariaLabel}>
            {pageNumbers.map((page) => (
              <button
                className={page === safePage ? "is-active" : undefined}
                type="button"
                role="option"
                aria-selected={page === safePage}
                key={page}
                onClick={() => {
                  onPageChange(page);
                  setIsOpen(false);
                }}
              >
                {String(page).padStart(2, "0")}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button
        className="icon-button"
        type="button"
        aria-label="Trang trước"
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        <CaretLeft size={17} weight="duotone" aria-hidden="true" />
      </button>
      <button
        className="icon-button"
        type="button"
        aria-label="Trang sau"
        disabled={safePage >= safePageCount}
        onClick={() => onPageChange(safePage + 1)}
      >
        <CaretRight size={17} weight="duotone" aria-hidden="true" />
      </button>
    </>
  );
}
