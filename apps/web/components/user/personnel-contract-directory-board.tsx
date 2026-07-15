"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent
} from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ResponsiveToolbarActionMenu } from "@/components/admin/responsive-toolbar-action-menu";
import { FormCheckbox } from "@/components/ui/form-controls";
import {
  CaretLeft,
  CaretRight,
  CaretDown,
  Certificate,
  Export,
  FormTemplate,
  GearSix,
  List,
  ListBullets,
  ListNumbers,
  ArchiveRestore,
  Package,
  SlidersHorizontal,
  Trash,
  UploadSimple
} from "@/lib/icons";
import type { PersonnelContractDirectoryData, PersonnelContractRecord } from "@/lib/personnel-contract-directory-api";

const pageSize = 50;
type ContractFilterPanel = "sort" | "group" | "columns";
type ActiveContractFilterPanel = ContractFilterPanel | null;

const contractFilterOptions: Record<ContractFilterPanel, string[]> = {
  sort: [
    "Cấp bậc",
    "Chức vụ",
    "Đã tạo ký số",
    "Đến ngày",
    "Giờ làm việc",
    "Hiệu lực từ ngày",
    "Hình thức hợp đồng",
    "Hợp đồng cha",
    "Hợp đồng hiện tại của nhân sự",
    "Ký số"
  ],
  group: ["Phòng ban", "Chi nhánh công ty", "Đang hiệu lực", "Hết hiệu lực", "Chưa hiệu lực", "Thanh lý", "Nhân sự"],
  columns: [
    "Người tạo",
    "Mã HĐ",
    "Tên nhân sự",
    "Phòng ban",
    "Tên hợp đồng",
    "Đã tạo ký số",
    "Trạng thái hồ sơ ký",
    "Ngày hoàn tất ký số",
    "Ngày ký",
    "Hiệu lực từ ngày",
    "Đến ngày",
    "Tình trạng",
    "Ngày tạo"
  ]
};

function formatDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.valueOf())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function statusLabel(status: string) {
  if (status === "ended" || status === "terminated" || status === "liquidated") {
    return "Đã thanh lý";
  }

  if (status === "draft") {
    return "Bản nháp";
  }

  if (status === "renewal_due") {
    return "Sắp hết hạn";
  }

  return "Đang hiệu lực";
}

function statusTone(status: string) {
  if (status === "ended" || status === "terminated" || status === "liquidated" || status === "draft") {
    return "is-ended";
  }

  if (status === "renewal_due") {
    return "is-warning";
  }

  return "is-active";
}

function creatorInitials(contract: PersonnelContractRecord) {
  const name = contract.creatorName.trim();

  if (!name) {
    return "A";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function contractDetailHref(contractId: string) {
  return `/apps/personnel-contract-contract/view?ID=${encodeURIComponent(contractId)}`;
}

export function PersonnelContractDirectoryBoard({ data }: { data: PersonnelContractDirectoryData }) {
  const router = useRouter();
  const [selectedContractIds, setSelectedContractIds] = useState<Set<string>>(() => new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterPanel, setActiveFilterPanel] = useState<ActiveContractFilterPanel>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const pageMenuRef = useRef<HTMLDivElement | null>(null);
  const pageCount = Math.max(1, Math.ceil(Math.max(data.contracts.length, 1) / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const pageStartIndex = (safePage - 1) * pageSize;
  const visibleContracts = useMemo(() => data.contracts.slice(pageStartIndex, pageStartIndex + pageSize), [data.contracts, pageStartIndex]);
  const visibleContractIds = visibleContracts.map((contract) => contract.id);
  const selectedVisibleCount = visibleContractIds.filter((id) => selectedContractIds.has(id)).length;
  const areAllVisibleContractsSelected = visibleContractIds.length > 0 && selectedVisibleCount === visibleContractIds.length;
  const isSomeVisibleContractSelected = selectedVisibleCount > 0 && !areAllVisibleContractsSelected;
  const selectedCount = selectedContractIds.size;
  const hasSelectedRows = selectedCount > 0;
  const displayStart = visibleContracts.length > 0 ? pageStartIndex + 1 : 0;
  const displayEnd = pageStartIndex + visibleContracts.length;
  const pageNumbers = useMemo(() => Array.from({ length: pageCount }, (_, index) => index + 1), [pageCount]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterOpen]);

  useEffect(() => {
    if (!isPageMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!pageMenuRef.current?.contains(event.target as Node)) {
        setIsPageMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPageMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPageMenuOpen]);

  const toggleAllVisibleContracts = () => {
    setSelectedContractIds((current) => {
      const next = new Set(current);

      if (areAllVisibleContractsSelected) {
        visibleContractIds.forEach((id) => next.delete(id));
      } else {
        visibleContractIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const toggleContract = (contractId: string) => {
    setSelectedContractIds((current) => {
      const next = new Set(current);

      if (next.has(contractId)) {
        next.delete(contractId);
      } else {
        next.add(contractId);
      }

      return next;
    });
  };

  const openContractDetail = (contractId: string) => {
    router.push(contractDetailHref(contractId) as Route);
  };

  const openContractDetailFromRow = (event: MouseEvent<HTMLTableRowElement>, contractId: string) => {
    if ((event.target as HTMLElement).closest("a, button, input, label")) {
      return;
    }

    openContractDetail(contractId);
  };

  const openContractDetailFromKeyboard = (event: ReactKeyboardEvent<HTMLTableRowElement>, contractId: string) => {
    if (event.key !== "Enter") {
      return;
    }

    openContractDetail(contractId);
  };

  return (
    <main className="admin-user-list-page personnel-contract-directory-page" aria-label="Loại hợp đồng">
      {data.source === "unavailable" ? (
        <section className="account-api-banner admin-user-api-banner" role="status">
          <strong>Chưa kết nối được dữ liệu hợp đồng</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      {hasSelectedRows ? (
        <section className="department-directory-bulk-actions personnel-contract-bulk-actions" aria-label="Thao tác với hợp đồng đã chọn">
          <button type="button">
            <Certificate size={16} weight="duotone" aria-hidden="true" />
            <span>Tạo hồ sơ ký số</span>
          </button>
          <button type="button">
            <ArchiveRestore size={16} weight="duotone" aria-hidden="true" />
            <span>Thanh lý</span>
          </button>
          <button type="button">
            <FormTemplate size={16} weight="duotone" aria-hidden="true" />
            <span>Biểu mẫu</span>
            <CaretDown size={13} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button">
            <Trash size={16} weight="duotone" aria-hidden="true" />
            <span>Xóa</span>
          </button>
          <button type="button">
            <Export size={16} weight="duotone" aria-hidden="true" />
            <span>Export</span>
          </button>
        </section>
      ) : (
        <nav className="admin-group-list-strip personnel-contract-list-strip" aria-label="Trạng thái hợp đồng">
          <button className="personnel-contract-strip-icon-button" type="button" aria-label="Mở menu trạng thái hợp đồng">
            <List size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button className="is-active" type="button">
            Tất cả ({data.contracts.length})
          </button>
        </nav>
      )}

      <section className="admin-user-toolbar department-directory-toolbar personnel-contract-toolbar has-responsive-actions" aria-label="Công cụ danh sách hợp đồng">
        <div className="admin-user-toolbar-left">
          <div className="admin-user-filter-wrap" ref={filterRef}>
            <button
              className={isFilterOpen ? "admin-user-filter-trigger is-active" : "admin-user-filter-trigger"}
              type="button"
              aria-label="Bộ lọc danh sách hợp đồng"
              aria-expanded={isFilterOpen}
              onClick={() => {
                setIsFilterOpen((current) => !current);
                setActiveFilterPanel(null);
              }}
            >
              <SlidersHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {isFilterOpen ? (
              <div
                className={activeFilterPanel ? "admin-user-filter-popover has-submenu personnel-contract-filter-popover" : "admin-user-filter-popover personnel-contract-filter-popover"}
                role="menu"
                aria-label="Bộ lọc danh sách hợp đồng"
                onMouseLeave={() => setActiveFilterPanel(null)}
              >
                <div className="admin-user-filter-menu">
                  <button
                    className={activeFilterPanel === "sort" ? "is-active" : undefined}
                    type="button"
                    role="menuitem"
                    aria-expanded={activeFilterPanel === "sort"}
                    onMouseEnter={() => setActiveFilterPanel("sort")}
                    onFocus={() => setActiveFilterPanel("sort")}
                    onClick={() => setActiveFilterPanel("sort")}
                  >
                    <ListNumbers size={17} weight="duotone" aria-hidden="true" />
                    <span>Sắp xếp danh sách</span>
                    <CaretRight size={15} weight="duotone" aria-hidden="true" />
                  </button>
                  <button
                    className={activeFilterPanel === "group" ? "is-active" : undefined}
                    type="button"
                    role="menuitem"
                    aria-expanded={activeFilterPanel === "group"}
                    onMouseEnter={() => setActiveFilterPanel("group")}
                    onFocus={() => setActiveFilterPanel("group")}
                    onClick={() => setActiveFilterPanel("group")}
                  >
                    <Package size={17} weight="duotone" aria-hidden="true" />
                    <span>Gộp nhóm theo</span>
                    <CaretRight size={15} weight="duotone" aria-hidden="true" />
                  </button>
                  <button
                    className={activeFilterPanel === "columns" ? "is-active" : undefined}
                    type="button"
                    role="menuitem"
                    aria-expanded={activeFilterPanel === "columns"}
                    onMouseEnter={() => setActiveFilterPanel("columns")}
                    onFocus={() => setActiveFilterPanel("columns")}
                    onClick={() => setActiveFilterPanel("columns")}
                  >
                    <ListBullets size={17} weight="duotone" aria-hidden="true" />
                    <span>Chọn cột hiển thị</span>
                    <CaretRight size={15} weight="duotone" aria-hidden="true" />
                  </button>
                </div>

                {activeFilterPanel ? (
                  <div className="admin-user-submenu personnel-contract-filter-submenu" role="group" aria-label="Tùy chọn bộ lọc hợp đồng">
                    {activeFilterPanel === "columns"
                      ? contractFilterOptions.columns.map((option) => (
                          <label className="personnel-contract-column-toggle" key={option}>
                            <span>{option}</span>
                            <input type="checkbox" defaultChecked />
                            <span className="admin-user-column-switch" aria-hidden="true" />
                          </label>
                        ))
                      : contractFilterOptions[activeFilterPanel].map((option) => (
                          <button type="button" key={option}>
                            <span>{option}</span>
                          </button>
                        ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {hasSelectedRows ? (
            <span>
              Đã chọn <strong>{selectedCount}</strong> bản ghi
            </span>
          ) : (
            <span>
              Hiển thị {displayStart} - {displayEnd} / {data.contracts.length} bản ghi
            </span>
          )}
          <div className="personnel-contract-page-picker" ref={pageMenuRef}>
            <button
              className={isPageMenuOpen ? "personnel-contract-page-trigger is-active" : "personnel-contract-page-trigger"}
              type="button"
              aria-expanded={isPageMenuOpen}
              aria-haspopup="listbox"
              onClick={() => setIsPageMenuOpen((current) => !current)}
            >
              <span>Trang: {String(safePage).padStart(2, "0")} / {String(pageCount).padStart(2, "0")}</span>
              <CaretDown size={16} weight="duotone" aria-hidden="true" />
            </button>
            {isPageMenuOpen ? (
              <div className="personnel-contract-page-menu" role="listbox" aria-label="Chọn trang hợp đồng">
                {pageNumbers.map((page) => (
                  <button
                    className={page === safePage ? "is-active" : undefined}
                    type="button"
                    role="option"
                    aria-selected={page === safePage}
                    key={page}
                    onClick={() => {
                      setCurrentPage(page);
                      setIsPageMenuOpen(false);
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
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <CaretLeft size={17} weight="duotone" aria-hidden="true" />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Trang sau"
            disabled={safePage >= pageCount}
            onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
          >
            <CaretRight size={17} weight="duotone" aria-hidden="true" />
          </button>
        </div>

        {hasSelectedRows ? null : (
          <ResponsiveToolbarActionMenu
            ariaLabel="Mở menu thao tác hợp đồng"
            actions={[
              {
                key: "export",
                icon: <Export size={16} weight="duotone" aria-hidden="true" />,
                label: "Export"
              },
              {
                key: "import",
                icon: <UploadSimple size={16} weight="duotone" aria-hidden="true" />,
                label: "Import"
              },
              {
                key: "settings",
                icon: <GearSix size={16} weight="duotone" aria-hidden="true" />,
                label: "Cài đặt"
              }
            ]}
          />
        )}
      </section>

      <div className="admin-user-table-shell personnel-contract-table-shell" tabIndex={0} aria-label="Bảng danh sách hợp đồng có thể cuộn ngang">
        <table className="admin-user-table personnel-contract-table">
          <thead>
            <tr>
              <th scope="col">
                <FormCheckbox
                  checked={areAllVisibleContractsSelected}
                  className="admin-user-table-checkbox"
                  disabled={visibleContractIds.length === 0}
                  label={<span className="sr-only">Chọn tất cả hợp đồng</span>}
                  aria-checked={isSomeVisibleContractSelected ? "mixed" : areAllVisibleContractsSelected}
                  onChange={toggleAllVisibleContracts}
                />
              </th>
              <th scope="col">Người tạo</th>
              <th scope="col">Mã HĐ</th>
              <th scope="col">Tên nhân sự</th>
              <th scope="col">Phòng ban</th>
              <th scope="col">Tên hợp đồng</th>
              <th scope="col">Đã tạo ký số</th>
              <th scope="col">Trạng thái hồ sơ ký</th>
              <th scope="col">Ngày hoàn tất ký số</th>
              <th scope="col">Ngày ký</th>
              <th scope="col">Hiệu lực từ ngày</th>
              <th scope="col">Đến ngày</th>
              <th scope="col">Tình trạng</th>
              <th scope="col">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {visibleContracts.map((contract) => (
              <tr
                className="personnel-contract-clickable-row"
                key={contract.id}
                tabIndex={0}
                onClick={(event) => openContractDetailFromRow(event, contract.id)}
                onKeyDown={(event) => openContractDetailFromKeyboard(event, contract.id)}
              >
                <td>
                  <FormCheckbox
                    checked={selectedContractIds.has(contract.id)}
                    className="admin-user-table-checkbox"
                    label={<span className="sr-only">Chọn hợp đồng {contract.code}</span>}
                    onChange={() => toggleContract(contract.id)}
                  />
                </td>
                <td>
                  <span className="personnel-contract-avatar" title={contract.creatorName}>
                    {creatorInitials(contract)}
                  </span>
                </td>
                <th scope="row">
                  <a className="personnel-contract-code-link" href={contractDetailHref(contract.id)}>
                    {contract.code}
                  </a>
                </th>
                <td>
                  <a className="personnel-contract-employee-chip" href={contractDetailHref(contract.id)}>
                    {contract.employeeName}
                  </a>
                </td>
                <td>{contract.departmentName}</td>
                <td>{contract.contractName}</td>
                <td>{contract.digitalStatus}</td>
                <td>{contract.signingProfileStatus}</td>
                <td>{formatDate(contract.signedCompletedAt)}</td>
                <td>{formatDate(contract.signedDate)}</td>
                <td>{formatDate(contract.startDate)}</td>
                <td>{formatDate(contract.endDate)}</td>
                <td>
                  <span className={`personnel-contract-status ${statusTone(contract.status)}`}>{statusLabel(contract.status)}</span>
                </td>
                <td>{formatDate(contract.createdAt)}</td>
              </tr>
            ))}
            {visibleContracts.length === 0 ? (
              <tr>
                <td colSpan={14}>
                  <span className="account-empty-state">Không có hợp đồng.</span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
