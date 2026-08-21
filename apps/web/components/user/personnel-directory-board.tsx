"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveToolbarActionMenu } from "@/components/admin/responsive-toolbar-action-menu";
import { FormCheckbox } from "@/components/ui/form-controls";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  CaretRight,
  CaretDown,
  Certificate,
  ChatCircleText,
  EnvelopeSimple,
  FileDownload,
  Export,
  FileText,
  GearSix,
  ListBullets,
  PencilSimple,
  SlidersHorizontal,
  Tag,
  Trash,
  UploadSimple,
  UserStatus
} from "@/lib/icons";
import { datedCsvFilename, exportCsv } from "@/lib/csv-export";
import type { EmployeeDirectoryData, EmployeeDirectoryRecord } from "@/lib/employee-directory-api";

type PersonnelFilter = "all" | "active" | "resigned";

const pageSize = 50;

const tabs: Array<{ key: PersonnelFilter; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang làm việc" },
  { key: "resigned", label: "Nghỉ việc" }
];

function formatDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function matchesFilter(employee: EmployeeDirectoryRecord, filter: PersonnelFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "active") {
    return employee.status !== "resigned";
  }

  return employee.status === "resigned";
}

function tabCount(employees: EmployeeDirectoryRecord[], filter: PersonnelFilter) {
  return employees.filter((employee) => matchesFilter(employee, filter)).length;
}

function positionLabel(employee: EmployeeDirectoryRecord) {
  return employee.positionName ?? employee.title ?? "--";
}

function titleLabel(employee: EmployeeDirectoryRecord) {
  return employee.jobTitleName ?? employee.title ?? "--";
}

function accountCreatedDate(employee: EmployeeDirectoryRecord) {
  return employee.accountCreatedAt ?? employee.createdAt ?? null;
}

function employeeProfileHref(employee: EmployeeDirectoryRecord) {
  return `/user?customMenu=employee-profile&employeeId=${encodeURIComponent(employee.id)}`;
}

export function PersonnelDirectoryBoard({ data }: { data: EmployeeDirectoryData }) {
  const [activeFilter, setActiveFilter] = useState<PersonnelFilter>("all");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(() => new Set());
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const bulkMenuRef = useRef<HTMLDivElement | null>(null);
  const filteredEmployees = useMemo(
    () => data.employees.filter((employee) => matchesFilter(employee, activeFilter)),
    [activeFilter, data.employees]
  );
  const pageCount = Math.max(1, Math.ceil(Math.max(filteredEmployees.length, 1) / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const pageStartIndex = (safePage - 1) * pageSize;
  const visibleEmployees = filteredEmployees.slice(pageStartIndex, pageStartIndex + pageSize);
  const visibleEmployeeIds = visibleEmployees.map((employee) => employee.id);
  const selectedVisibleCount = visibleEmployeeIds.filter((id) => selectedEmployeeIds.has(id)).length;
  const areAllVisibleEmployeesSelected = visibleEmployeeIds.length > 0 && selectedVisibleCount === visibleEmployeeIds.length;
  const isSomeVisibleEmployeeSelected = selectedVisibleCount > 0 && !areAllVisibleEmployeesSelected;
  const selectedCount = selectedEmployeeIds.size;
  const hasSelectedRows = selectedCount > 0;
  const selectedEmployees = useMemo(
    () => filteredEmployees.filter((employee) => selectedEmployeeIds.has(employee.id)),
    [filteredEmployees, selectedEmployeeIds]
  );
  const displayStart = visibleEmployees.length > 0 ? pageStartIndex + 1 : 0;
  const displayEnd = pageStartIndex + visibleEmployees.length;

  const exportEmployees = (employees: EmployeeDirectoryRecord[]) => {
    exportCsv({
      filename: datedCsvFilename("danh-sach-nhan-su"),
      rows: employees,
      columns: [
        { header: "Mã NS", value: (employee) => employee.code },
        { header: "Mã chấm công", value: (employee) => employee.attendanceCode },
        { header: "Họ và tên", value: (employee) => employee.fullName },
        { header: "Phòng ban", value: (employee) => employee.department },
        { header: "Vị trí", value: positionLabel },
        { header: "Chức vụ", value: titleLabel },
        { header: "Ngày vào", value: (employee) => formatDate(employee.startDate) },
        { header: "Trạng thái", value: (employee) => employee.status },
        { header: "Email", value: (employee) => employee.accountEmail },
        { header: "Ngày tạo tài khoản", value: (employee) => formatDate(accountCreatedDate(employee)) }
      ]
    });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!isBulkMenuOpen) {
      return;
    }

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!bulkMenuRef.current?.contains(event.target as Node)) {
        setIsBulkMenuOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBulkMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isBulkMenuOpen]);

  const toggleAllVisibleEmployees = () => {
    setSelectedEmployeeIds((current) => {
      const next = new Set(current);

      if (areAllVisibleEmployeesSelected) {
        visibleEmployeeIds.forEach((id) => next.delete(id));
      } else {
        visibleEmployeeIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((current) => {
      const next = new Set(current);

      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }

      return next;
    });
  };

  return (
    <main className="admin-user-list-page personnel-directory-page" aria-label="Danh sách nhân sự">
      {data.source === "unavailable" ? (
        <section className="account-api-banner admin-user-api-banner" role="status">
          <strong>Chưa kết nối được dữ liệu nhân sự</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      {hasSelectedRows ? (
        <section className="personnel-directory-selection-bar" aria-label="Thao tác với nhân sự đã chọn">
          <div className="personnel-directory-selection-actions">
            <button type="button">
              <Certificate size={16} weight="duotone" aria-hidden="true" />
              <span>Tạo hồ sơ ký số</span>
            </button>
            <button type="button">
              <UserStatus size={16} weight="duotone" aria-hidden="true" />
              <span>Trạng thái</span>
            </button>
            <button type="button">
              <FileDownload size={16} weight="duotone" aria-hidden="true" />
              <span>Tải hồ sơ</span>
            </button>
            <button type="button">
              <FileText size={16} weight="duotone" aria-hidden="true" />
              <span>Biểu mẫu</span>
              <CaretDown size={13} weight="duotone" aria-hidden="true" />
            </button>
            <button type="button">
              <EnvelopeSimple size={16} weight="duotone" aria-hidden="true" />
              <span>Email</span>
            </button>
            <div className="personnel-directory-bulk-menu-wrap" ref={bulkMenuRef}>
              <button
                className="personnel-directory-bulk-more"
                type="button"
                aria-label="Mở thêm thao tác nhân sự"
                aria-expanded={isBulkMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsBulkMenuOpen((current) => !current)}
              >
                <CaretDown size={16} weight="duotone" aria-hidden="true" />
              </button>

              {isBulkMenuOpen ? (
                <div className="personnel-directory-bulk-menu" role="menu">
                  <button className="personnel-directory-mobile-menu-item" type="button" role="menuitem">
                    <Certificate size={17} weight="duotone" aria-hidden="true" />
                    <span>Tạo hồ sơ ký số</span>
                  </button>
                  <button className="personnel-directory-mobile-menu-item" type="button" role="menuitem">
                    <UserStatus size={17} weight="duotone" aria-hidden="true" />
                    <span>Trạng thái</span>
                  </button>
                  <button className="personnel-directory-mobile-menu-item" type="button" role="menuitem">
                    <FileDownload size={17} weight="duotone" aria-hidden="true" />
                    <span>Tải hồ sơ</span>
                  </button>
                  <button className="personnel-directory-mobile-menu-item" type="button" role="menuitem">
                    <FileText size={17} weight="duotone" aria-hidden="true" />
                    <span>Biểu mẫu</span>
                    <CaretRight size={15} weight="duotone" aria-hidden="true" />
                  </button>
                  <button className="personnel-directory-mobile-menu-item" type="button" role="menuitem">
                    <EnvelopeSimple size={17} weight="duotone" aria-hidden="true" />
                    <span>Email</span>
                  </button>
                  <button type="button" role="menuitem">
                    <ChatCircleText size={17} weight="duotone" aria-hidden="true" />
                    <span>Sms/Zalo</span>
                    <CaretRight size={15} weight="duotone" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      exportEmployees(selectedEmployees);
                      setIsBulkMenuOpen(false);
                    }}
                  >
                    <Export size={17} weight="duotone" aria-hidden="true" />
                    <span>Export</span>
                  </button>
                  <button type="button" role="menuitem">
                    <Tag size={17} weight="duotone" aria-hidden="true" />
                    <span>Gắn/Di chuyển nhãn</span>
                  </button>
                  <button type="button" role="menuitem">
                    <Trash size={17} weight="duotone" aria-hidden="true" />
                    <span>Xóa</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <button className="personnel-directory-view-mode" type="button">
            <ListBullets size={17} weight="duotone" aria-hidden="true" />
            <span>Danh sách</span>
            <CaretDown size={13} weight="duotone" aria-hidden="true" />
          </button>
        </section>
      ) : (
        <nav className="department-directory-tabs personnel-directory-tabs" aria-label="Trạng thái nhân sự">
          {tabs.map((tab) => (
            <button
              className={activeFilter === tab.key ? "is-active" : undefined}
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
            >
              {tab.label} ({tabCount(data.employees, tab.key)})
            </button>
          ))}
        </nav>
      )}

      <section className="admin-user-toolbar department-directory-toolbar personnel-directory-toolbar has-responsive-actions" aria-label="Công cụ danh sách nhân sự">
        <div className="admin-user-toolbar-left">
          <button className="admin-user-filter-trigger" type="button" aria-label="Bộ lọc danh sách nhân sự">
            <SlidersHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
          {hasSelectedRows ? (
            <span>
              Đã chọn <strong>{selectedCount}</strong> bản ghi
            </span>
          ) : (
            <span>
              Hiển thị {displayStart} - {displayEnd} / {filteredEmployees.length} bản ghi
            </span>
          )}
          <ListPagination
            ariaLabel="Chọn trang nhân sự"
            currentPage={safePage}
            pageCount={pageCount}
            onPageChange={setCurrentPage}
          />
        </div>

        {hasSelectedRows ? null : (
          <ResponsiveToolbarActionMenu
            ariaLabel="Mở menu thao tác nhân sự"
            actions={[
              {
                key: "tag",
                icon: <Tag size={16} weight="duotone" aria-hidden="true" />,
                label: "Nhãn"
              },
              {
                key: "export",
                icon: <Export size={16} weight="duotone" aria-hidden="true" />,
                label: "Export",
                onClick: () => exportEmployees(filteredEmployees)
              },
              {
                key: "update-address",
                icon: <PencilSimple size={16} weight="duotone" aria-hidden="true" />,
                label: "Cập nhật địa chỉ mới"
              },
              {
                key: "email",
                icon: <EnvelopeSimple size={16} weight="duotone" aria-hidden="true" />,
                label: "Email"
              },
              {
                key: "sms",
                icon: <ChatCircleText size={16} weight="duotone" aria-hidden="true" />,
                label: "Sms/Zalo"
              },
              {
                key: "import",
                icon: <UploadSimple size={16} weight="duotone" aria-hidden="true" />,
                label: "Import"
              },
              {
                key: "settings",
                href: "/admin/settings/job-positions",
                icon: <GearSix size={16} weight="duotone" aria-hidden="true" />,
                label: "Cài đặt"
              }
            ]}
          />
        )}
      </section>

      <div className="admin-user-table-shell personnel-directory-table-shell" tabIndex={0} aria-label="Bảng danh sách nhân sự có thể cuộn ngang">
        <table className="admin-user-table personnel-directory-table">
          <thead>
            <tr>
              <th scope="col">
                <FormCheckbox
                  checked={areAllVisibleEmployeesSelected}
                  className="admin-user-table-checkbox"
                  disabled={visibleEmployeeIds.length === 0}
                  label={<span className="sr-only">Chọn tất cả nhân sự</span>}
                  aria-checked={isSomeVisibleEmployeeSelected ? "mixed" : areAllVisibleEmployeesSelected}
                  onChange={toggleAllVisibleEmployees}
                />
              </th>
              <th scope="col">Mã NS</th>
              <th scope="col">Mã chấm công</th>
              <th scope="col">Họ và tên</th>
              <th scope="col">Phòng ban</th>
              <th scope="col">Vị trí</th>
              <th scope="col">Chức vụ</th>
              <th scope="col">Cấp bậc <span aria-hidden="true">↑</span></th>
              <th scope="col">Ngày vào</th>
              <th scope="col">Chữ ký số</th>
              <th scope="col">Ngày sinh</th>
              <th scope="col">Giới tính</th>
              <th scope="col">Ngày tạo TK HOffice</th>
            </tr>
          </thead>
          <tbody>
            {visibleEmployees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <FormCheckbox
                    checked={selectedEmployeeIds.has(employee.id)}
                    className="admin-user-table-checkbox"
                    label={<span className="sr-only">Chọn {employee.fullName}</span>}
                    onChange={() => toggleEmployee(employee.id)}
                  />
                </td>
                <th scope="row">
                  <span className="personnel-directory-code">{employee.code}</span>
                </th>
                <td>{employee.attendanceCode ?? "--"}</td>
                <td>
                  <a className="personnel-directory-name-link" href={employeeProfileHref(employee)}>
                    {employee.fullName}
                  </a>
                </td>
                <td>{employee.department}</td>
                <td>{positionLabel(employee)}</td>
                <td>{titleLabel(employee)}</td>
                <td>--</td>
                <td>{formatDate(employee.startDate)}</td>
                <td>Chưa tạo</td>
                <td>--</td>
                <td>--</td>
                <td>{formatDate(accountCreatedDate(employee))}</td>
              </tr>
            ))}
            {visibleEmployees.length === 0 ? (
              <tr>
                <td colSpan={13}>
                  <span className="account-empty-state">Không có nhân sự ở trạng thái này.</span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
