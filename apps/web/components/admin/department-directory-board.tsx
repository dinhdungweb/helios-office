"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DepartmentDialog } from "@/components/admin/org-chart-settings-board";
import { DepartmentBulkConfirmDialog } from "@/components/admin/department-bulk-confirm-dialog";
import { ResponsiveToolbarActionMenu } from "@/components/admin/responsive-toolbar-action-menu";
import { FormCheckbox } from "@/components/ui/form-controls";
import {
  CaretRight,
  Clock,
  DotsThree,
  Export,
  GearSix,
  List,
  MagnifyingGlass,
  Network,
  PencilSimple,
  SlidersHorizontal,
  TextAlignLeft,
  UploadSimple,
  X
} from "@/lib/icons";
import { datedCsvFilename, exportCsv } from "@/lib/csv-export";
import type { DepartmentRecord, OrgChartData } from "@/lib/org-chart-api";

type DepartmentDirectoryRow = DepartmentRecord & {
  depth: number;
  displayTitle: string;
  isCompanyRoot?: boolean;
  permissionStructureLabel: string;
};

type DepartmentDirectoryTab = "departments" | "business" | "types" | "inactive";
type DepartmentFilterPanel = "sort" | "columns" | null;
type DepartmentSortDirection = "asc" | "desc";
type DepartmentColumnKey = "title" | "permissionStructure" | "departmentType" | "businessBlock";

type DepartmentColumn = {
  defaultVisible: boolean;
  key: DepartmentColumnKey;
  label: string;
};

const departmentColumns: DepartmentColumn[] = [
  { key: "title", label: "Tiêu đề", defaultVisible: true },
  { key: "permissionStructure", label: "Cấu trúc quyền", defaultVisible: true },
  { key: "departmentType", label: "Loại phòng ban", defaultVisible: true },
  { key: "businessBlock", label: "Khối nghiệp vụ", defaultVisible: true }
];

const defaultVisibleDepartmentColumnKeys = departmentColumns
  .filter((column) => column.defaultVisible)
  .map((column) => column.key);

const departmentTypeRows: DepartmentDirectoryRow[] = [
  {
    id: "department-type-department",
    code: "department",
    name: "Phòng ban",
    displayTitle: "Phòng ban",
    parentId: null,
    parentName: null,
    headId: null,
    head: null,
    permissionStructure: "department",
    departmentType: null,
    businessUnit: null,
    description: null,
    isManagementUnit: false,
    status: "active",
    headcount: 0,
    childCount: 0,
    depth: 0,
    permissionStructureLabel: "--"
  },
  {
    id: "department-type-branch",
    code: "branch",
    name: "Chi nhánh công ty",
    displayTitle: "Chi nhánh công ty",
    parentId: null,
    parentName: null,
    headId: null,
    head: null,
    permissionStructure: "branch",
    departmentType: null,
    businessUnit: null,
    description: null,
    isManagementUnit: false,
    status: "active",
    headcount: 0,
    childCount: 0,
    depth: 0,
    permissionStructureLabel: "--"
  }
];

function hasStructuredPrefix(name: string) {
  return /^([A-Z]|\d+(?:\.\d+)*)\.\s+/i.test(name.trim());
}

function withStructuredPrefix(prefix: string, name: string) {
  return hasStructuredPrefix(name) ? name : `${prefix}. ${name}`;
}

function buildDirectoryRows(departments: DepartmentRecord[]) {
  const childrenByParentId = new Map<string, DepartmentRecord[]>();
  const departmentById = new Map(departments.map((department) => [department.id, department]));
  const rows: DepartmentDirectoryRow[] = [];
  const visited = new Set<string>();

  for (const department of departments) {
    const key = department.parentId ?? "root";
    const siblings = childrenByParentId.get(key) ?? [];
    siblings.push(department);
    childrenByParentId.set(key, siblings);
  }

  const permissionStructureFor = (department: DepartmentRecord) => {
    return {
      company: "Công ty",
      branch: "Chi nhánh công ty",
      department: "Phòng ban"
    }[department.permissionStructure];
  };

  const appendRows = (
    department: DepartmentRecord,
    depth: number,
    prefix: string,
    options?: { isCompanyRoot?: boolean; resetChildPrefix?: boolean }
  ) => {
    if (visited.has(department.id)) {
      return;
    }

    visited.add(department.id);
    rows.push({
      ...department,
      depth,
      displayTitle: withStructuredPrefix(prefix, department.name),
      isCompanyRoot: options?.isCompanyRoot,
      permissionStructureLabel: permissionStructureFor(department)
    });

    const children = childrenByParentId.get(department.id) ?? [];

    children.forEach((child, index) => {
      appendRows(
        child,
        depth + 1,
        options?.resetChildPrefix ? String(index + 1) : `${prefix}.${index + 1}`
      );
    });
  };

  const roots = departments.filter((department) => !department.parentId || !departmentById.has(department.parentId));
  let rootNumber = 1;

  roots.forEach((department) => {
    const isCompanyRoot = department.permissionStructure === "company";

    if (isCompanyRoot) {
      appendRows(department, 0, "A", { isCompanyRoot: true, resetChildPrefix: true });
      return;
    }

    appendRows(department, 0, String(rootNumber));
    rootNumber += 1;
  });

  for (const department of departments) {
    if (!visited.has(department.id)) {
      appendRows(department, 0, String(rows.length + 1));
    }
  }

  return rows;
}

function removeQueryParam(pathname: string, params: URLSearchParams, key: string) {
  const nextParams = new URLSearchParams(params);
  nextParams.delete(key);
  const query = nextParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function departmentColumnValue(columnKey: DepartmentColumnKey, department: DepartmentDirectoryRow) {
  switch (columnKey) {
    case "title":
      return department.displayTitle;
    case "permissionStructure":
      return department.permissionStructureLabel;
    case "departmentType":
      return department.departmentType
        ? {
            department: "Phòng ban",
            branch: "Chi nhánh",
            team: "Nhóm"
          }[department.departmentType] ?? department.departmentType
        : "--";
    case "businessBlock":
      return department.businessUnit
        ? {
            business: "Khối kinh doanh",
            operations: "Khối vận hành",
            accounting: "Khối kế toán",
            hr: "Khối nhân sự"
          }[department.businessUnit] ?? department.businessUnit
        : "--";
  }
}

function DepartmentColumnToggle({
  column,
  isVisible,
  onToggle,
  showHandle
}: {
  column: DepartmentColumn;
  isVisible: boolean;
  onToggle: () => void;
  showHandle?: boolean;
}) {
  return (
    <label className="admin-user-column-toggle">
      <span className="admin-user-column-handle" aria-hidden="true">
        {showHandle ? <DotsThree size={15} weight="duotone" /> : null}
      </span>
      <span>{column.label}</span>
      <input type="checkbox" checked={isVisible} onChange={onToggle} />
      <span className="admin-user-column-switch" aria-hidden="true" />
    </label>
  );
}

export function DepartmentDirectoryBoard({ data }: { data: OrgChartData }) {
  const activeDepartments = useMemo(
    () => data.departments.filter((department) => department.status === "active"),
    [data.departments]
  );
  const inactiveDepartments = useMemo(
    () => data.departments.filter((department) => department.status !== "active"),
    [data.departments]
  );
  const departmentRows = useMemo(() => buildDirectoryRows(activeDepartments), [activeDepartments]);
  const inactiveRows = useMemo(() => buildDirectoryRows(inactiveDepartments), [inactiveDepartments]);
  const [activeTab, setActiveTab] = useState<DepartmentDirectoryTab>("departments");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterPanel, setActiveFilterPanel] = useState<DepartmentFilterPanel>(null);
  const [columnQuery, setColumnQuery] = useState("");
  const [sortColumnKey, setSortColumnKey] = useState<DepartmentColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<DepartmentSortDirection>("asc");
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<DepartmentColumnKey>>(
    () => new Set(defaultVisibleDepartmentColumnKeys)
  );
  const [bulkMessage, setBulkMessage] = useState("");
  const filterRef = useRef<HTMLDivElement | null>(null);
  const rows = activeTab === "departments"
    ? departmentRows
    : activeTab === "types"
      ? departmentTypeRows
      : activeTab === "inactive"
        ? inactiveRows
        : [];
  const sortedRows = useMemo(() => {
    if (!sortColumnKey) {
      return rows;
    }

    return [...rows].sort((left, right) => {
      const result = departmentColumnValue(sortColumnKey, left).localeCompare(
        departmentColumnValue(sortColumnKey, right),
        "vi",
        { numeric: true, sensitivity: "base" }
      );

      return sortDirection === "asc" ? result : -result;
    });
  }, [rows, sortColumnKey, sortDirection]);
  const visibleRows = sortedRows.slice(0, 25);
  const visibleColumns = departmentColumns.filter((column) => visibleColumnKeys.has(column.key));
  const visibleRowIds = useMemo(
    () => visibleRows.filter((department) => !department.isCompanyRoot).map((department) => department.id),
    [visibleRows]
  );
  const selectedVisibleCount = visibleRowIds.filter((id) => selectedRowIds.has(id)).length;
  const areAllVisibleRowsSelected = visibleRowIds.length > 0 && selectedVisibleCount === visibleRowIds.length;
  const isSomeVisibleRowSelected = selectedVisibleCount > 0 && !areAllVisibleRowsSelected;
  const selectedRowCount = selectedRowIds.size;
  const hasSelectedRows = selectedRowCount > 0;
  const selectedDepartments = useMemo(
    () => rows.filter((department) => selectedRowIds.has(department.id) && !department.isCompanyRoot),
    [rows, selectedRowIds]
  );
  const selectedDepartmentIds = useMemo(
    () => selectedDepartments.map((department) => department.id),
    [selectedDepartments]
  );
  const tabs: Array<{ count: number; key: DepartmentDirectoryTab; label: string }> = [
    { key: "departments", label: "Phòng ban, chi nhánh", count: departmentRows.length },
    { key: "business", label: "Khối nghiệp vụ", count: 0 },
    { key: "types", label: "Loại phòng ban", count: departmentTypeRows.length },
    { key: "inactive", label: "Phòng ban không hoạt động", count: inactiveRows.length }
  ];

  useEffect(() => {
    if (searchParams.get("create") === "department") {
      setIsCreateDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const closeFilter = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false);
        setActiveFilterPanel(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
        setActiveFilterPanel(null);
      }
    };

    document.addEventListener("pointerdown", closeFilter);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeFilter);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFilterOpen]);

  useEffect(() => {
    if (!bulkMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setBulkMessage(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [bulkMessage]);

  const chooseSortColumn = (columnKey: DepartmentColumnKey) => {
    if (sortColumnKey === columnKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumnKey(columnKey);
    setSortDirection("asc");
  };

  const clearSort = () => {
    setSortColumnKey(null);
    setSortDirection("asc");
    setVisibleColumnKeys(new Set(defaultVisibleDepartmentColumnKeys));
    setColumnQuery("");
    setActiveFilterPanel(null);
    setIsFilterOpen(false);
  };

  const toggleColumn = (columnKey: DepartmentColumnKey) => {
    setVisibleColumnKeys((current) => {
      const next = new Set(current);

      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }

      return next.size > 0 ? next : current;
    });
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    router.replace(removeQueryParam(pathname, searchParams, "create") as Route, { scroll: false });
    router.refresh();
  };

  const toggleAllVisibleRows = () => {
    setSelectedRowIds((current) => {
      const next = new Set(current);

      if (areAllVisibleRowsSelected) {
        visibleRowIds.forEach((id) => next.delete(id));
      } else {
        visibleRowIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const toggleRow = (departmentId: string) => {
    setSelectedRowIds((current) => {
      const next = new Set(current);

      if (next.has(departmentId)) {
        next.delete(departmentId);
      } else {
        next.add(departmentId);
      }

      return next;
    });
  };

  const completeBulkAction = useCallback((message: string) => {
    setSelectedRowIds(new Set());
    setBulkMessage(message);
  }, []);

  const exportSelectedDepartments = () => {
    if (selectedDepartments.length === 0) {
      setBulkMessage("Không có phòng ban hợp lệ để export.");
      return;
    }

    exportCsv({
      filename: datedCsvFilename("phong-ban"),
      rows: selectedDepartments,
      columns: [
        { header: "Mã", value: (department) => department.code },
        { header: "Tên phòng ban", value: (department) => department.name },
        { header: "Phòng ban cha", value: (department) => department.parentName },
        { header: "Cấu trúc quyền", value: (department) => department.permissionStructureLabel },
        { header: "Trạng thái", value: (department) => department.status === "active" ? "Đang hoạt động" : "Đã đóng" },
        { header: "Số nhân sự", value: (department) => department.headcount },
        { header: "Số phòng ban con", value: (department) => department.childCount }
      ]
    });
    setBulkMessage(`Đã export ${selectedDepartments.length} phòng ban.`);
  };

  return (
    <main className="admin-user-list-page department-directory-page" aria-label="Danh sách phòng ban">
      {bulkMessage ? (
        <div className="account-group-change-success" role="status">
          <span>{bulkMessage}</span>
        </div>
      ) : null}
      {data.source === "unavailable" ? (
        <section className="account-api-banner admin-user-api-banner" role="status">
          <strong>Chưa kết nối được API phòng ban</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      {hasSelectedRows ? (
        <section className="department-directory-bulk-actions personnel-contract-bulk-actions" aria-label="Thao tác với phòng ban đã chọn">
          <button type="button" onClick={exportSelectedDepartments}>
            <Export size={16} weight="duotone" aria-hidden="true" />
            <span>Export</span>
          </button>
          <DepartmentBulkConfirmDialog
            departmentIds={selectedDepartmentIds}
            mode="archive"
            onSuccess={completeBulkAction}
          />
          <DepartmentBulkConfirmDialog
            departmentIds={selectedDepartmentIds}
            mode="delete"
            onSuccess={completeBulkAction}
          />
        </section>
      ) : (
        <nav className="department-directory-tabs" aria-label="Nhóm danh sách phòng ban">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.key ? "is-active" : undefined}
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      )}

      <section className="admin-user-toolbar department-directory-toolbar has-responsive-actions" aria-label="Công cụ danh sách phòng ban">
        <div className="admin-user-toolbar-left">
          <div className="admin-user-filter-wrap" ref={filterRef}>
            <button
              className={isFilterOpen ? "admin-user-filter-trigger is-active" : "admin-user-filter-trigger"}
              type="button"
              aria-label="Bộ lọc danh sách phòng ban"
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
                className={
                  activeFilterPanel === "columns"
                    ? "admin-user-filter-popover has-column-panel"
                    : activeFilterPanel
                      ? "admin-user-filter-popover has-submenu"
                      : "admin-user-filter-popover"
                }
                role="menu"
                aria-label="Bộ lọc danh sách phòng ban"
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
                    <TextAlignLeft size={17} weight="duotone" aria-hidden="true" />
                    <span>Sắp xếp danh sách</span>
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
                    <List size={17} weight="duotone" aria-hidden="true" />
                    <span>Chọn cột hiển thị</span>
                    <CaretRight size={15} weight="duotone" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onMouseEnter={() => setActiveFilterPanel(null)}
                    onFocus={() => setActiveFilterPanel(null)}
                    onClick={clearSort}
                  >
                    <X size={17} weight="duotone" aria-hidden="true" />
                    <span>Bỏ sắp xếp</span>
                  </button>
                </div>

                {activeFilterPanel === "sort" ? (
                  <div className="admin-user-submenu" role="group" aria-label="Chọn cột sắp xếp phòng ban">
                    {departmentColumns.map((column) => (
                      <button
                        className={sortColumnKey === column.key ? "is-selected" : undefined}
                        type="button"
                        key={column.key}
                        onClick={() => chooseSortColumn(column.key)}
                      >
                        <span>{column.label}</span>
                        {sortColumnKey === column.key ? (
                          <CaretRight
                            className={sortDirection === "desc" ? "is-desc" : undefined}
                            size={15}
                            weight="duotone"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {activeFilterPanel === "columns" ? (
                  <section className="admin-user-column-panel" aria-label="Trường hiển thị phòng ban">
                    <header>
                      <h3>Trường hiển thị</h3>
                      <button className="icon-button" type="button" aria-label="Đóng trường hiển thị" onClick={() => setActiveFilterPanel(null)}>
                        <X size={18} weight="duotone" aria-hidden="true" />
                      </button>
                    </header>
                    <label className="admin-user-column-search">
                      <span className="sr-only">Tìm kiếm trường</span>
                      <input
                        value={columnQuery}
                        type="search"
                        placeholder="Tìm kiếm trường"
                        onChange={(event) => setColumnQuery(event.target.value)}
                      />
                      <MagnifyingGlass size={18} weight="duotone" aria-hidden="true" />
                    </label>
                    <div className="admin-user-column-list">
                      {departmentColumns
                        .filter((column) => column.label.toLowerCase().includes(columnQuery.trim().toLowerCase()))
                        .map((column) => (
                          <DepartmentColumnToggle
                            column={column}
                            isVisible={visibleColumnKeys.has(column.key)}
                            key={column.key}
                            showHandle={visibleColumnKeys.has(column.key)}
                            onToggle={() => toggleColumn(column.key)}
                          />
                        ))}
                    </div>
                    <footer>
                      <button
                        type="button"
                        onClick={() => {
                          setVisibleColumnKeys(new Set(defaultVisibleDepartmentColumnKeys));
                          setColumnQuery("");
                        }}
                      >
                        Mặc định
                      </button>
                    </footer>
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
          {hasSelectedRows ? (
            <span>
              Đã chọn <strong>{selectedRowCount}</strong> bản ghi
            </span>
          ) : (
            <span>
              Hiển thị 1 - {visibleRows.length} / {rows.length} bản ghi
            </span>
          )}
        </div>

        {hasSelectedRows ? null : (
          <ResponsiveToolbarActionMenu
            ariaLabel="Mở menu thao tác phòng ban"
            actions={[
              {
                key: "chart",
                href: "/admin/settings/org-chart?view=chart",
                icon: <Network size={16} weight="duotone" aria-hidden="true" />,
                label: "Sơ đồ"
              },
              {
                key: "update",
                icon: <PencilSimple size={16} weight="duotone" aria-hidden="true" />,
                label: "Cập nhật phòng ..."
              },
              {
                key: "history",
                icon: <Clock size={16} weight="duotone" aria-hidden="true" />,
                label: "Lịch sử"
              },
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
                href: "/admin/settings/system",
                icon: <GearSix size={16} weight="duotone" aria-hidden="true" />,
                label: "Cài đặt"
              }
            ]}
          />
        )}
      </section>

      <div className="admin-user-table-shell department-directory-table-shell" tabIndex={0} aria-label="Bảng danh sách phòng ban có thể cuộn ngang">
        <table className="admin-user-table department-directory-table">
          <thead>
            <tr>
              <th scope="col">
                <FormCheckbox
                  checked={areAllVisibleRowsSelected}
                  className="admin-user-table-checkbox"
                  disabled={visibleRowIds.length === 0}
                  label={<span className="sr-only">Chọn tất cả phòng ban</span>}
                  aria-checked={isSomeVisibleRowSelected ? "mixed" : areAllVisibleRowsSelected}
                  onChange={toggleAllVisibleRows}
                />
              </th>
              {visibleColumns.map((column) => (
                <th
                  scope="col"
                  key={column.key}
                  aria-sort={
                    column.key === sortColumnKey
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {column.label}
                  {column.key === sortColumnKey ? (
                    <span aria-hidden="true">{sortDirection === "asc" ? " ↑" : " ↓"}</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((department) => (
              <tr key={department.id}>
                <td>
                  <FormCheckbox
                    checked={selectedRowIds.has(department.id)}
                    className="admin-user-table-checkbox"
                    disabled={department.isCompanyRoot}
                    label={<span className="sr-only">Chọn {department.name}</span>}
                    onChange={() => toggleRow(department.id)}
                  />
                </td>
                {visibleColumns.map((column) => {
                  if (column.key === "title") {
                    return (
                      <th scope="row" key={column.key}>
                        <span
                          className={department.isCompanyRoot ? "department-directory-title is-company-root" : "department-directory-title"}
                          style={{ "--department-depth": department.depth } as CSSProperties}
                        >
                          {department.childCount > 0 || department.isCompanyRoot ? <Network size={15} weight="duotone" aria-hidden="true" /> : null}
                          {department.displayTitle}
                        </span>
                      </th>
                    );
                  }

                  return <td key={column.key}>{departmentColumnValue(column.key, department)}</td>;
                })}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1}>
                  <span className="account-empty-state">Chưa có phòng ban nào trong hệ thống.</span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isCreateDialogOpen ? (
        <DepartmentDialog
          departments={data.departments}
          employees={data.employees}
          mode="create"
          onClose={closeCreateDialog}
        />
      ) : null}
    </main>
  );
}
