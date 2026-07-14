"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DepartmentDialog } from "@/components/admin/org-chart-settings-board";
import { ResponsiveToolbarActionMenu } from "@/components/admin/responsive-toolbar-action-menu";
import { FormCheckbox } from "@/components/ui/form-controls";
import {
  Clock,
  Export,
  GearSix,
  Lock,
  Network,
  PencilSimple,
  SlidersHorizontal,
  Trash,
  UploadSimple
} from "@/lib/icons";
import type { DepartmentRecord, OrgChartData } from "@/lib/org-chart-api";

type DepartmentDirectoryRow = DepartmentRecord & {
  depth: number;
  displayTitle: string;
  isCompanyRoot?: boolean;
  permissionStructure: string;
};

type DepartmentDirectoryTab = "departments" | "business" | "types" | "inactive";

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
    status: "active",
    headcount: 0,
    childCount: 0,
    depth: 0,
    permissionStructure: "--"
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
    status: "active",
    headcount: 0,
    childCount: 0,
    depth: 0,
    permissionStructure: "--"
  }
];

function hasStructuredPrefix(name: string) {
  return /^([A-Z]|\d+(?:\.\d+)*)\.\s+/i.test(name.trim());
}

function withStructuredPrefix(prefix: string, name: string) {
  return hasStructuredPrefix(name) ? name : `${prefix}. ${name}`;
}

function buildDirectoryRows(departments: DepartmentRecord[], includeCompanyRoot = true) {
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
    if (!department.parentId && department.childCount > 0) {
      return "Chi nhánh công ty";
    }

    return "Phòng ban";
  };

  const appendRows = (department: DepartmentRecord, depth: number, prefix: string) => {
    if (visited.has(department.id)) {
      return;
    }

    visited.add(department.id);
    rows.push({
      ...department,
      depth,
      displayTitle: withStructuredPrefix(prefix, department.name),
      permissionStructure: permissionStructureFor(department)
    });

    const children = childrenByParentId.get(department.id) ?? [];

    children.forEach((child, index) => {
      appendRows(child, depth + 1, `${prefix}.${index + 1}`);
    });
  };

  const roots = departments.filter((department) => !department.parentId || !departmentById.has(department.parentId));

  if (includeCompanyRoot && departments.length > 0) {
    rows.push({
      id: "company-root-srg",
      code: "SRG",
      name: "SRG",
      displayTitle: "A. SRG",
      parentId: null,
      parentName: null,
      headId: null,
      head: null,
      status: "active",
      headcount: departments.reduce((total, department) => total + department.headcount, 0),
      childCount: roots.length,
      depth: 0,
      isCompanyRoot: true,
      permissionStructure: "Công ty"
    });
  }

  roots.forEach((department, index) => {
    appendRows(department, includeCompanyRoot ? 1 : 0, String(index + 1));
  });

  for (const department of departments) {
    if (!visited.has(department.id)) {
      appendRows(department, includeCompanyRoot ? 1 : 0, String(rows.length + 1));
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
  const inactiveRows = useMemo(() => buildDirectoryRows(inactiveDepartments, false), [inactiveDepartments]);
  const [activeTab, setActiveTab] = useState<DepartmentDirectoryTab>("departments");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set());
  const rows = activeTab === "departments"
    ? departmentRows
    : activeTab === "types"
      ? departmentTypeRows
      : activeTab === "inactive"
        ? inactiveRows
        : [];
  const visibleRows = rows.slice(0, 25);
  const visibleRowIds = useMemo(() => visibleRows.map((department) => department.id), [visibleRows]);
  const selectedVisibleCount = visibleRowIds.filter((id) => selectedRowIds.has(id)).length;
  const areAllVisibleRowsSelected = visibleRowIds.length > 0 && selectedVisibleCount === visibleRowIds.length;
  const isSomeVisibleRowSelected = selectedVisibleCount > 0 && !areAllVisibleRowsSelected;
  const selectedRowCount = selectedRowIds.size;
  const hasSelectedRows = selectedRowCount > 0;
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

  return (
    <main className="admin-user-list-page department-directory-page" aria-label="Danh sách phòng ban">
      {data.source === "unavailable" ? (
        <section className="account-api-banner admin-user-api-banner" role="status">
          <strong>Chưa kết nối được API phòng ban</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      {hasSelectedRows ? (
        <section className="department-directory-bulk-actions" aria-label="Thao tác với phòng ban đã chọn">
          <button type="button">
            <Export size={16} weight="duotone" aria-hidden="true" />
            <span>Export</span>
          </button>
          <button type="button">
            <Lock size={16} weight="duotone" aria-hidden="true" />
            <span>Đóng</span>
          </button>
          <button type="button">
            <Trash size={16} weight="duotone" aria-hidden="true" />
            <span>Xóa</span>
          </button>
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
          <button className="admin-user-filter-trigger" type="button" aria-label="Bộ lọc danh sách phòng ban">
            <SlidersHorizontal size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
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
                href: "/admin/settings/org-chart?view=chart",
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
              <th scope="col">Tiêu đề</th>
              <th scope="col">Cấu trúc quyền</th>
              <th scope="col">Loại phòng ban</th>
              <th scope="col">Khối nghiệp vụ</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((department) => (
              <tr key={department.id}>
                <td>
                  <FormCheckbox
                    checked={selectedRowIds.has(department.id)}
                    className="admin-user-table-checkbox"
                    label={<span className="sr-only">Chọn {department.name}</span>}
                    onChange={() => toggleRow(department.id)}
                  />
                </td>
                <th scope="row">
                  <span
                    className={department.isCompanyRoot ? "department-directory-title is-company-root" : "department-directory-title"}
                    style={{ "--department-depth": department.depth } as CSSProperties}
                  >
                    {department.childCount > 0 || department.isCompanyRoot ? <Network size={15} weight="duotone" aria-hidden="true" /> : null}
                    {department.displayTitle}
                  </span>
                </th>
                <td>{department.permissionStructure}</td>
                <td>--</td>
                <td>--</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
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
