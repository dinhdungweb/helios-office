"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FormCheckbox, FormSelect } from "@/components/ui/form-controls";
import { Button, FormField, FormInput, FormTextarea, ModalDialog, StateBlock } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/badge";
import {
  ArrowSquareOut,
  Archive,
  ArchiveRestore,
  CheckCircle,
  ClipboardText,
  Clock,
  FileClock,
  Key,
  MagnifyingGlass,
  Network,
  Package,
  PencilSimple,
  Plus,
  Users
} from "@/lib/icons";
import {
  archiveDepartmentAction,
  createDepartmentAction,
  restoreDepartmentAction,
  updateDepartmentAction,
  type DepartmentFormState
} from "@/lib/org-chart-actions";
import type { DepartmentRecord, OrgChartData, OrgEmployeeOption } from "@/lib/org-chart-api";
import { organizationCatalog, organizationChangeLogs } from "@/lib/mock-data";

type DepartmentTreeNode = DepartmentRecord & {
  children: DepartmentTreeNode[];
};

type DepartmentDialogMode = "create" | "edit";

const initialState: DepartmentFormState = { ok: false };

function buildDepartmentTree(departments: DepartmentRecord[]) {
  const nodes = new Map<string, DepartmentTreeNode>();
  const roots: DepartmentTreeNode[] = [];

  for (const department of departments.filter((item) => item.status === "active")) {
    nodes.set(department.id, { ...department, children: [] });
  }

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function buildDepartmentOptions(departments: DepartmentRecord[], excludedId?: string) {
  return [
    { label: "Không có cấp cha", value: "none" },
    ...departments
      .filter((department) => department.status === "active" && department.id !== excludedId)
      .map((department) => ({
        label: department.name,
        description: department.parentName ?? "Cấp cao nhất",
        value: department.id
      }))
  ];
}

function buildHeadOptions(employees: OrgEmployeeOption[]) {
  return [
    { label: "Chưa gán trưởng phòng", value: "none" },
    ...employees.map((employee) => ({
      label: employee.name,
      description: `${employee.title} · ${employee.department}`,
      value: employee.id
    }))
  ];
}

function DepartmentStatusBadge({ department }: { department: DepartmentRecord }) {
  return (
    <Badge
      className={department.status === "active" ? "org-status org-status--active" : "org-status org-status--paused"}
      tone={department.status === "active" ? "success" : "neutral"}
    >
      {department.status === "active" ? "Hoạt động" : "Đã lưu trữ"}
    </Badge>
  );
}

function OrgTreeNode({
  node,
  depth = 0,
  selectedDepartmentId,
  onSelect
}: {
  node: DepartmentTreeNode;
  depth?: number;
  selectedDepartmentId?: string;
  onSelect: (departmentId: string) => void;
}) {
  return (
    <article className="org-tree-node" style={{ "--org-depth": depth } as CSSProperties}>
      <button
        className={`org-tree-node-main org-tree-node-button${selectedDepartmentId === node.id ? " is-selected" : ""}`}
        type="button"
        onClick={() => onSelect(node.id)}
      >
        <span className="org-tree-node-icon org-tree-node-icon--department">
          <Users size={17} weight="duotone" aria-hidden="true" />
        </span>
        <div>
          <h3>{node.name}</h3>
          <p>{node.parentName ?? "Cấp cao nhất"} · {node.headcount} nhân sự</p>
        </div>
      </button>
      <DepartmentStatusBadge department={node} />
      {node.children.length > 0 ? (
        <div className="org-tree-children">
          {node.children.map((child) => (
            <OrgTreeNode
              depth={depth + 1}
              selectedDepartmentId={selectedDepartmentId}
              key={child.id}
              node={child}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function OrgSummary({ departments }: { departments: DepartmentRecord[] }) {
  const activeDepartments = departments.filter((department) => department.status === "active");
  const summaryItems = [
    { label: "Phòng ban", value: activeDepartments.length, icon: Users },
    { label: "Đã lưu trữ", value: departments.length - activeDepartments.length, icon: FileClock },
    { label: "Nhân sự", value: activeDepartments.reduce((total, department) => total + department.headcount, 0), icon: CheckCircle },
    { label: "Vị trí/chức vụ", value: organizationCatalog.length, icon: ClipboardText }
  ];

  return (
    <section className="org-summary-grid" aria-label="Tổng quan sơ đồ tổ chức">
      {summaryItems.map((item) => (
        <article className="org-summary-card" key={item.label}>
          <span>
            <item.icon size={19} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <strong>{item.value}</strong>
            <p>{item.label}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export function DepartmentDialog({
  department,
  departments,
  employees,
  mode,
  onClose
}: {
  department?: DepartmentRecord;
  departments: DepartmentRecord[];
  employees: OrgEmployeeOption[];
  mode: DepartmentDialogMode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [state, formAction, isPending] = useActionState(
    mode === "create" ? createDepartmentAction : updateDepartmentAction,
    initialState
  );

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (state.ok) {
      onClose();
    }
  }, [onClose, state.ok]);

  if (mode === "create") {
    return (
      <ModalDialog
        className="org-department-dialog org-department-dialog--quick"
        onCloseRequest={onClose}
        ref={dialogRef}
        title="Tạo mới phòng ban, chi nhánh"
      >
        <form className="account-dialog-form org-department-form" action={formAction} autoComplete="off">
          <div className="account-dialog-grid org-department-form-grid">
            <FormField className="org-floating-field" label={<>Cấu trúc quyền <b aria-hidden="true">*</b></>}>
              <FormSelect
                ariaLabel="Chọn cấu trúc quyền"
                defaultValue="department"
                menuLabel="Danh sách cấu trúc quyền"
                name="permissionStructure"
                options={[
                  { label: "Công ty", value: "company" },
                  { label: "Chi nhánh công ty", value: "branch" },
                  { label: "Phòng ban", value: "department" }
                ]}
                placeholder="Cấu trúc quyền"
                required
              />
            </FormField>
            <FormField label="Mã">
              <FormInput name="code" placeholder="Mã" autoComplete="off" />
            </FormField>
            <FormField label={<>Tên phòng ban <b aria-hidden="true">*</b></>} wide>
              <FormInput name="name" required minLength={2} placeholder="Tên phòng ban" autoComplete="off" />
            </FormField>
            <FormCheckbox className="org-department-manager-check" name="isManagementUnit" label="Là đơn vị cấp quản lý" />
            <FormField className="org-floating-field org-department-search-field" label="Giám sát công việc" wide>
              <FormSelect
                ariaLabel="Chọn giám sát công việc"
                menuLabel="Danh sách nhân sự"
                name="headId"
                options={buildHeadOptions(employees)}
                placeholder="Giám sát công việc"
              />
              <MagnifyingGlass size={18} weight="duotone" aria-hidden="true" />
            </FormField>
            <FormField label="Thuộc phòng ban" wide>
              <FormSelect
                ariaLabel="Chọn phòng ban cấp cha"
                menuLabel="Danh sách phòng ban cấp cha"
                name="parentId"
                options={buildDepartmentOptions(departments)}
                placeholder="Chọn phòng ban"
              />
            </FormField>
            <FormField
              helpText="Lựa chọn cài đặt này giúp người quản trị có thể xuất ra các báo cáo theo nghiệp vụ. VD: Báo cáo lương của khối nghiệp vụ kế toán, kinh doanh,..."
              label="Khối nghiệp vụ"
              wide
            >
              <FormSelect
                ariaLabel="Chọn khối nghiệp vụ"
                menuLabel="Danh sách khối nghiệp vụ"
                name="businessUnit"
                options={[
                  { label: "Khối kinh doanh", value: "business" },
                  { label: "Khối vận hành", value: "operations" },
                  { label: "Khối kế toán", value: "accounting" },
                  { label: "Khối nhân sự", value: "people" }
                ]}
                placeholder="Khối nghiệp vụ"
              />
            </FormField>
            <FormField
              helpText="Phòng ban là 1 đơn vị nội bộ trực thuộc doanh nghiệp, nó được hiểu là 1 nhóm / 1 đội / 1 phòng / 1 ban / 1 khối... Để lên báo cáo một cách tường minh hơn, bạn nên cấu hình và lựa chọn loại cài đặt này"
              label="Loại phòng ban"
              wide
            >
              <FormSelect
                ariaLabel="Chọn loại phòng ban"
                menuLabel="Danh sách loại phòng ban"
                name="departmentType"
                options={[
                  { label: "Phòng ban", value: "department" },
                  { label: "Chi nhánh", value: "branch" },
                  { label: "Nhóm", value: "team" },
                  { label: "Khối", value: "division" }
                ]}
                placeholder="Loại phòng ban"
              />
            </FormField>
            <FormField className="org-floating-field" label="Mô tả" wide>
              <FormTextarea name="description" rows={2} placeholder="Mô tả" autoComplete="off" />
            </FormField>
          </div>
          {state.error ? <p className="account-dialog-error">{state.error}</p> : null}
          <div className="account-dialog-actions org-department-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              HỦY BỎ
            </button>
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "ĐANG XỬ LÝ" : "CẬP NHẬT"}
            </button>
          </div>
        </form>
      </ModalDialog>
    );
  }

  return (
    <ModalDialog
      className="org-department-dialog"
      onCloseRequest={onClose}
      ref={dialogRef}
      title="Sửa phòng ban"
    >
      <form className="account-dialog-form" action={formAction}>
        {department ? <input name="id" type="hidden" value={department.id} /> : null}
        <div className="account-dialog-grid">
          <FormField label="Tên phòng ban" wide>
            <FormInput name="name" required minLength={2} defaultValue={department?.name ?? ""} />
          </FormField>
          <FormField label="Cấp cha">
            <FormSelect
              ariaLabel="Chọn cấp cha"
              defaultValue={department?.parentId ?? "none"}
              menuLabel="Danh sách phòng ban cấp cha"
              name="parentId"
              options={buildDepartmentOptions(departments, department?.id)}
              placeholder="Chọn cấp cha"
            />
          </FormField>
          <FormField label="Trưởng phòng">
            <FormSelect
              ariaLabel="Chọn trưởng phòng"
              defaultValue={department?.headId ?? "none"}
              menuLabel="Danh sách nhân sự"
              name="headId"
              options={buildHeadOptions(employees)}
              placeholder="Chọn trưởng phòng"
            />
          </FormField>
        </div>
        {state.error ? <p className="account-dialog-error">{state.error}</p> : null}
        <div className="account-dialog-actions">
          <Button icon={<Clock size={16} weight="duotone" aria-hidden="true" />} onClick={onClose} variant="secondary">
            Hủy
          </Button>
          <Button
            icon={<CheckCircle size={16} weight="duotone" aria-hidden="true" />}
            isLoading={isPending}
            type="submit"
            variant="primary"
          >
            Lưu
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}

function OrgTreePanel({
  departments,
  onCreate,
  onSelect,
  selectedDepartmentId
}: {
  departments: DepartmentRecord[];
  onCreate: () => void;
  onSelect: (departmentId: string) => void;
  selectedDepartmentId?: string;
}) {
  const tree = useMemo(() => buildDepartmentTree(departments), [departments]);

  return (
    <section className="org-panel org-tree-panel" aria-labelledby="org-tree-title">
      <header className="org-panel-header">
        <div>
          <h2 id="org-tree-title">Cây sơ đồ tổ chức</h2>
          <p>Quản lý cấp cha, trưởng phòng và trạng thái phòng ban từ dữ liệu thật.</p>
        </div>
        <div className="org-panel-actions">
          <button className="primary-button" type="button" onClick={onCreate}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Thêm phòng ban
          </button>
        </div>
      </header>

      <div className="org-tree-list">
        {tree.length > 0 ? (
          tree.map((node) => (
            <OrgTreeNode
              key={node.id}
              node={node}
              onSelect={onSelect}
              selectedDepartmentId={selectedDepartmentId}
            />
          ))
        ) : (
          <StateBlock title="Chưa có phòng ban">Tạo phòng ban đầu tiên để dựng sơ đồ tổ chức.</StateBlock>
        )}
      </div>
    </section>
  );
}

function OrgUnitDetailPanel({
  department,
  onEdit
}: {
  department?: DepartmentRecord;
  onEdit: (department: DepartmentRecord) => void;
}) {
  if (!department) {
    return (
      <section className="org-panel" aria-labelledby="org-unit-detail-title">
        <StateBlock title="Chưa chọn phòng ban">Chọn một phòng ban trong cây sơ đồ để xem chi tiết.</StateBlock>
      </section>
    );
  }

  return (
    <section className="org-panel" aria-labelledby="org-unit-detail-title">
      <header className="org-panel-header">
        <div>
          <h2 id="org-unit-detail-title">{department.name}</h2>
          <p>{department.parentName ?? "Cấp cao nhất"}</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => onEdit(department)}>
          <ArrowSquareOut size={16} weight="duotone" aria-hidden="true" />
          Sửa phòng ban
        </button>
      </header>

      <dl className="org-detail-list">
        <div>
          <dt>Mã phòng ban</dt>
          <dd>{department.code}</dd>
        </div>
        <div>
          <dt>Trưởng phòng</dt>
          <dd>{department.head ? `${department.head.name} · ${department.head.title}` : "Chưa gán"}</dd>
        </div>
        <div>
          <dt>Nhân sự</dt>
          <dd>{department.headcount} người</dd>
        </div>
        <div>
          <dt>Phòng ban con</dt>
          <dd>{department.childCount} mục</dd>
        </div>
        <div>
          <dt>Trạng thái</dt>
          <dd>{department.status === "active" ? "Hoạt động" : "Đã lưu trữ"}</dd>
        </div>
      </dl>
    </section>
  );
}

function DepartmentTable({
  departments,
  onEdit
}: {
  departments: DepartmentRecord[];
  onEdit: (department: DepartmentRecord) => void;
}) {
  return (
    <section className="org-panel" aria-labelledby="department-table-title">
      <header className="org-panel-header">
        <div>
          <h2 id="department-table-title">Danh sách phòng ban</h2>
          <p>{departments.length} phòng ban trong hệ thống</p>
        </div>
      </header>

      <div className="org-catalog-table-shell" tabIndex={0} aria-label="Bảng phòng ban có thể cuộn ngang">
        <table className="org-catalog-table org-department-table">
          <thead>
            <tr>
              <th scope="col">Phòng ban</th>
              <th scope="col">Cấp cha</th>
              <th scope="col">Trưởng phòng</th>
              <th scope="col">Nhân sự</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Tác vụ</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((department) => {
              const canArchive = department.headcount === 0 && department.childCount === 0;

              return (
                <tr key={department.id}>
                  <th scope="row">
                    <strong>{department.name}</strong>
                    <small>{department.code}</small>
                  </th>
                  <td>{department.parentName ?? "Cấp cao nhất"}</td>
                  <td>{department.head?.name ?? "Chưa gán"}</td>
                  <td>{department.headcount}</td>
                  <td>
                    <DepartmentStatusBadge department={department} />
                  </td>
                  <td>
                    <div className="account-row-actions">
                      <button className="icon-button" type="button" aria-label="Sửa phòng ban" onClick={() => onEdit(department)}>
                        <PencilSimple size={16} weight="duotone" aria-hidden="true" />
                      </button>
                      {department.status === "active" ? (
                        <form action={archiveDepartmentAction}>
                          <input name="id" type="hidden" value={department.id} />
                          <button
                            className="icon-button"
                            type="submit"
                            aria-label="Lưu trữ phòng ban"
                            disabled={!canArchive}
                            title={canArchive ? "Lưu trữ phòng ban" : "Cần chuyển hết nhân sự và phòng ban con trước"}
                          >
                            <Archive size={16} weight="duotone" aria-hidden="true" />
                          </button>
                        </form>
                      ) : (
                        <form action={restoreDepartmentAction}>
                          <input name="id" type="hidden" value={department.id} />
                          <button className="icon-button" type="submit" aria-label="Khôi phục phòng ban">
                            <ArchiveRestore size={16} weight="duotone" aria-hidden="true" />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PositionTitlePanel() {
  return (
    <section className="org-panel" aria-labelledby="org-catalog-title">
      <header className="org-panel-header">
        <div>
          <h2 id="org-catalog-title">Vị trí & chức vụ</h2>
          <p>Danh mục này sẽ được nối DB ở bước Phase 3 tiếp theo.</p>
        </div>
        <a className="secondary-button" href="/admin/settings/job-positions">
          <ArrowSquareOut size={16} weight="duotone" aria-hidden="true" />
          Mở danh mục
        </a>
      </header>

      <div className="org-catalog-table-shell" tabIndex={0} aria-label="Bảng vị trí và chức vụ có thể cuộn ngang">
        <table className="org-catalog-table">
          <thead>
            <tr>
              <th scope="col">Tên</th>
              <th scope="col">Loại</th>
              <th scope="col">Mã</th>
              <th scope="col">Tính lương</th>
              <th scope="col">Phân quyền</th>
            </tr>
          </thead>
          <tbody>
            {organizationCatalog.slice(0, 5).map((item) => (
              <tr key={item.id}>
                <th scope="row">
                  <strong>{item.name}</strong>
                  <small>{item.group}</small>
                </th>
                <td>{item.type === "position" ? "Vị trí" : "Chức vụ"}</td>
                <td>{item.code}</td>
                <td>{item.payrollCode}</td>
                <td>{item.permissionCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrgOperationsPanel() {
  return (
    <section className="org-panel" aria-labelledby="org-operations-title">
      <header className="org-panel-header">
        <div>
          <h2 id="org-operations-title">Vận hành & lịch sử</h2>
          <p>Các thay đổi phòng ban mới được ghi vào AuditLog hệ thống.</p>
        </div>
      </header>

      <div className="org-operation-list">
        {organizationChangeLogs.slice(0, 4).map((log) => (
          <article className="org-operation-row" key={log.id}>
            <span>
              <FileClock size={16} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{log.action}</h3>
              <p>{log.actor} · {log.target}</p>
              <time>{log.time}</time>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OrgImpactPanel() {
  const items = [
    {
      title: "Phân quyền tự động",
      body: "Nhân viên thuộc đơn vị nào sẽ mặc định thấy dữ liệu trong phạm vi đơn vị đó.",
      icon: Key
    },
    {
      title: "Quy trình duyệt",
      body: "Đơn từ tự động gửi lên đúng trưởng bộ phận theo sơ đồ phân cấp.",
      icon: Network
    },
    {
      title: "Tính lương",
      body: "Quỹ lương và chi phí được phân bổ theo từng bộ phận.",
      icon: Clock
    }
  ];

  return (
    <section className="org-impact-panel" aria-label="Ý nghĩa vận hành">
      {items.map((item) => (
        <article key={item.title}>
          <span>
            <item.icon size={18} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export function OrgChartSettingsBoard({ data }: { data: OrgChartData }) {
  const firstActiveDepartment = data.departments.find((department) => department.status === "active");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(firstActiveDepartment?.id);
  const [dialog, setDialog] = useState<{ mode: DepartmentDialogMode; department?: DepartmentRecord } | null>(null);
  const selectedDepartment = data.departments.find((department) => department.id === selectedDepartmentId) ?? firstActiveDepartment;

  return (
    <main className="org-chart-settings-page" aria-label="Cài đặt sơ đồ tổ chức">
      <section className="org-page-heading" aria-labelledby="org-page-title">
        <div>
          <span>Cài đặt hệ thống</span>
          <h1 id="org-page-title">Sơ đồ tổ chức</h1>
          <p>Quản lý phòng ban, cấp cha, trưởng phòng và trạng thái lưu trữ bằng dữ liệu thật.</p>
        </div>
        <a className="secondary-button" href="/admin/settings">
          Quay lại cài đặt
        </a>
      </section>

      {data.source === "unavailable" ? (
        <StateBlock tone="error" title="Chưa kết nối được API phòng ban">
          {data.error}
        </StateBlock>
      ) : null}

      <OrgSummary departments={data.departments} />

      <section className="org-settings-layout" aria-label="Thiết lập sơ đồ tổ chức">
        <div className="org-settings-main">
          <OrgTreePanel
            departments={data.departments}
            onCreate={() => setDialog({ mode: "create" })}
            onSelect={setSelectedDepartmentId}
            selectedDepartmentId={selectedDepartment?.id}
          />
          <DepartmentTable
            departments={data.departments}
            onEdit={(department) => setDialog({ mode: "edit", department })}
          />
          <PositionTitlePanel />
        </div>
        <aside className="org-settings-side" aria-label="Chi tiết và vận hành">
          <OrgUnitDetailPanel
            department={selectedDepartment}
            onEdit={(department) => setDialog({ mode: "edit", department })}
          />
          <OrgOperationsPanel />
        </aside>
      </section>

      <OrgImpactPanel />

      {dialog ? (
        <DepartmentDialog
          department={dialog.department}
          departments={data.departments}
          employees={data.employees}
          mode={dialog.mode}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </main>
  );
}
