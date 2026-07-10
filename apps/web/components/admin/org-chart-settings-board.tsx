import {
  ArrowSquareOut,
  CheckCircle,
  ClipboardText,
  Clock,
  Export,
  FileClock,
  Key,
  Network,
  Package,
  Plus,
  UploadSimple,
  Users
} from "@/lib/icons";
import type { CSSProperties } from "react";
import {
  organizationCatalog,
  organizationChangeLogs,
  organizationTree,
  type OrgUnitNode
} from "@/lib/mock-data";

const unitTypeLabels: Record<OrgUnitNode["type"], string> = {
  company: "Công ty",
  branch: "Chi nhánh",
  department: "Phòng ban"
};

function flattenUnits(unit: OrgUnitNode): OrgUnitNode[] {
  return [unit, ...(unit.children ?? []).flatMap((child) => flattenUnits(child))];
}

const allUnits = flattenUnits(organizationTree);
const selectedUnit = allUnits.find((unit) => unit.id === "unit-marketing") ?? organizationTree;

function OrgTreeNode({ unit, depth = 0 }: { unit: OrgUnitNode; depth?: number }) {
  return (
    <article className="org-tree-node" style={{ "--org-depth": depth } as CSSProperties}>
      <div className="org-tree-node-main">
        <span className={`org-tree-node-icon org-tree-node-icon--${unit.type}`}>
          {unit.type === "company" ? (
            <Network size={17} weight="duotone" aria-hidden="true" />
          ) : unit.type === "branch" ? (
            <Package size={17} weight="duotone" aria-hidden="true" />
          ) : (
            <Users size={17} weight="duotone" aria-hidden="true" />
          )}
        </span>
        <div>
          <h3>{unit.name}</h3>
          <p>{unit.code} · {unitTypeLabels[unit.type]} · {unit.headcount} nhân sự</p>
        </div>
      </div>
      <span className={unit.status === "active" ? "org-status org-status--active" : "org-status org-status--paused"}>
        {unit.status === "active" ? "Hoạt động" : "Ngưng"}
      </span>
      {unit.children?.length ? (
        <div className="org-tree-children">
          {unit.children.map((child) => (
            <OrgTreeNode unit={child} depth={depth + 1} key={child.id} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function OrgSummary() {
  const summaryItems = [
    { label: "Chi nhánh", value: allUnits.filter((unit) => unit.type === "branch").length, icon: Package },
    { label: "Phòng ban", value: allUnits.filter((unit) => unit.type === "department").length, icon: Users },
    { label: "Nhân sự", value: allUnits.reduce((total, unit) => total + unit.headcount, 0), icon: CheckCircle },
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

function OrgTreePanel() {
  return (
    <section className="org-panel org-tree-panel" aria-labelledby="org-tree-title">
      <header className="org-panel-header">
        <div>
          <h2 id="org-tree-title">Cây sơ đồ tổ chức</h2>
          <p>Kéo thả để thay đổi vị trí hoặc dùng menu nhanh để thêm, sửa, xóa, ngưng hoạt động.</p>
        </div>
        <div className="org-panel-actions">
          <button className="secondary-button" type="button">
            <UploadSimple size={16} weight="duotone" aria-hidden="true" />
            Import
          </button>
          <button className="secondary-button" type="button">
            <Export size={16} weight="duotone" aria-hidden="true" />
            Export
          </button>
          <button className="primary-button" type="button">
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Thêm đơn vị
          </button>
        </div>
      </header>

      <div className="org-tree-list">
        <OrgTreeNode unit={organizationTree} />
      </div>
    </section>
  );
}

function OrgUnitDetailPanel() {
  return (
    <section className="org-panel" aria-labelledby="org-unit-detail-title">
      <header className="org-panel-header">
        <div>
          <h2 id="org-unit-detail-title">{selectedUnit.name}</h2>
          <p>{selectedUnit.code} · {unitTypeLabels[selectedUnit.type]}</p>
        </div>
        <button className="secondary-button" type="button">
          <ArrowSquareOut size={16} weight="duotone" aria-hidden="true" />
          Sửa đơn vị
        </button>
      </header>

      <dl className="org-detail-list">
        <div>
          <dt>Người đứng đầu</dt>
          <dd>{selectedUnit.head} · {selectedUnit.headTitle}</dd>
        </div>
        <div>
          <dt>Địa điểm làm việc</dt>
          <dd>{selectedUnit.location}</dd>
        </div>
        <div>
          <dt>GPS chấm công</dt>
          <dd>{selectedUnit.gps}</dd>
        </div>
        <div>
          <dt>Dải IP</dt>
          <dd>{selectedUnit.ipRange}</dd>
        </div>
        <div>
          <dt>Cấu hình ký số</dt>
          <dd>{selectedUnit.signatureProfile}</dd>
        </div>
      </dl>

      <div className="org-tag-list" aria-label="Nhãn phòng ban">
        {selectedUnit.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
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
          <p>Danh mục dùng cho hồ sơ nhân sự, tính lương và phân quyền tự động.</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} weight="duotone" aria-hidden="true" />
          Thêm danh mục
        </button>
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
            {organizationCatalog.map((item) => (
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
          <p>Import/Export, dán nhãn và truy vết thay đổi cấu trúc tổ chức.</p>
        </div>
      </header>

      <div className="org-operation-list">
        {organizationChangeLogs.map((log) => (
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

export function OrgChartSettingsBoard() {
  return (
    <main className="org-chart-settings-page" aria-label="Cài đặt sơ đồ tổ chức">
      <section className="org-page-heading" aria-labelledby="org-page-title">
        <div>
          <span>Cài đặt hệ thống</span>
          <h1 id="org-page-title">Sơ đồ tổ chức</h1>
          <p>Quản lý chi nhánh, phòng ban, vị trí, chức vụ, địa điểm chấm công và lịch sử thay đổi.</p>
        </div>
        <a className="secondary-button" href="/admin/settings#system-settings">
          Quay lại cài đặt
        </a>
      </section>

      <OrgSummary />

      <section className="org-settings-layout" aria-label="Thiết lập sơ đồ tổ chức">
        <div className="org-settings-main">
          <OrgTreePanel />
          <PositionTitlePanel />
        </div>
        <aside className="org-settings-side" aria-label="Chi tiết và vận hành">
          <OrgUnitDetailPanel />
          <OrgOperationsPanel />
        </aside>
      </section>

      <OrgImpactPanel />
    </main>
  );
}
