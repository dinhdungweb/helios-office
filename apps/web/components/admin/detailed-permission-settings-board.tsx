import {
  Check,
  CheckCircle,
  ClipboardText,
  Eye,
  FunnelSimple,
  Key,
  Lock,
  PencilSimple,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X
} from "@/lib/icons";
import {
  detailedPermissionObjects,
  permissionGroups,
  permissionMergeExamples,
  type DetailedPermissionAction,
  type DetailedPermissionObject,
  type DetailedPermissionScope,
  type FieldPermissionMode
} from "@/lib/mock-data";

const selectedGroup = permissionGroups.find((group) => group.id === "grp-project-managers") ?? permissionGroups[0];
const groupPermissions = detailedPermissionObjects.filter((permission) => permission.groupId === selectedGroup.id);
const selectedPermission = groupPermissions[0] ?? detailedPermissionObjects[0];

const actionLabels: Record<DetailedPermissionAction, string> = {
  view: "Xem",
  add: "Thêm",
  edit: "Sửa",
  delete: "Xóa",
  manage: "Quản lý"
};

const scopeLabels: Record<DetailedPermissionScope, string> = {
  private: "Cá nhân",
  department: "Phòng ban",
  parent_department: "Phòng ban cha",
  public: "Toàn công ty"
};

const fieldModeLabels: Record<FieldPermissionMode, string> = {
  hidden: "Ẩn",
  readonly: "Chỉ xem",
  editable: "Được sửa"
};

const actionIcons = {
  view: Eye,
  add: CheckCircle,
  edit: PencilSimple,
  delete: X,
  manage: ShieldCheck
};

const allActions: DetailedPermissionAction[] = ["view", "add", "edit", "delete", "manage"];
const allScopes: DetailedPermissionScope[] = ["private", "department", "parent_department", "public"];

function PermissionSummary() {
  const manageObjects = detailedPermissionObjects.filter((permission) => permission.actions.includes("manage")).length;
  const fieldRules = detailedPermissionObjects.reduce((total, permission) => total + permission.fieldSecurity.length, 0);
  const hiddenMenus = detailedPermissionObjects.filter((permission) => !permission.menuVisible).length;
  const summaryItems = [
    { label: "Đối tượng", value: detailedPermissionObjects.length, icon: ClipboardText },
    { label: "Có quyền Manage", value: manageObjects, icon: ShieldCheck },
    { label: "Field rules", value: fieldRules, icon: Lock },
    { label: "Menu bị ẩn", value: hiddenMenus, icon: Eye }
  ];

  return (
    <section className="account-summary-grid" aria-label="Tổng quan quyền chi tiết">
      {summaryItems.map((item) => (
        <article className="account-summary-card" key={item.label}>
          <span>
            <item.icon size={20} weight="duotone" aria-hidden="true" />
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

function ActionPermissionTable() {
  return (
    <section className="account-panel" aria-labelledby="detailed-permission-table-title">
      <header className="account-panel-header">
        <div>
          <h2 id="detailed-permission-table-title">Phân quyền theo hành động</h2>
          <p>Nhóm đang cấu hình: {selectedGroup.name}</p>
        </div>
        <div className="account-panel-actions">
          <button className="secondary-button" type="button">
            <FunnelSimple size={16} weight="duotone" aria-hidden="true" />
            Bộ lọc
          </button>
          <button className="secondary-button" type="button">
            <SlidersHorizontal size={16} weight="duotone" aria-hidden="true" />
            Cột
          </button>
          <button className="primary-button" type="button">
            <CheckCircle size={16} weight="duotone" aria-hidden="true" />
            Lưu quyền
          </button>
        </div>
      </header>

      <div className="account-filter-row" aria-label="Bộ lọc quyền chi tiết">
        <button className="is-selected" type="button">Quản lý dự án</button>
        <button type="button">WORK</button>
        <button type="button">CRM</button>
        <button type="button">HRM</button>
        <button type="button">Có Manage</button>
        <button type="button">Có Export</button>
      </div>

      <div className="group-table-shell" tabIndex={0} aria-label="Bảng quyền chi tiết có thể cuộn ngang">
        <table className="detailed-permission-table">
          <thead>
            <tr>
              <th scope="col">Đối tượng</th>
              <th scope="col">Module</th>
              {allActions.map((action) => (
                <th scope="col" key={action}>{actionLabels[action]}</th>
              ))}
              <th scope="col">Scope</th>
              <th scope="col">Menu</th>
            </tr>
          </thead>
          <tbody>
            {detailedPermissionObjects.map((permission) => (
              <tr className={permission.id === selectedPermission.id ? "is-selected" : undefined} key={permission.id}>
                <th scope="row">
                  <strong>{permission.object}</strong>
                  <small>{permission.objectCode} · {permission.summary}</small>
                </th>
                <td>{permission.module}</td>
                {allActions.map((action) => {
                  const isAllowed = permission.actions.includes(action);
                  const ActionIcon = actionIcons[action];

                  return (
                    <td key={action}>
                      <span className={isAllowed ? "group-action-check is-allowed" : "group-action-check"}>
                        {isAllowed ? (
                          <ActionIcon size={14} weight="duotone" aria-label={`Có quyền ${actionLabels[action]}`} />
                        ) : (
                          <Lock size={14} weight="duotone" aria-label={`Không có quyền ${actionLabels[action]}`} />
                        )}
                      </span>
                    </td>
                  );
                })}
                <td>
                  <span className={`permission-scope-pill permission-scope-pill--${permission.scope}`}>
                    {scopeLabels[permission.scope]}
                  </span>
                </td>
                <td>
                  <span className={permission.menuVisible ? "permission-menu-state is-visible" : "permission-menu-state"}>
                    {permission.menuVisible ? "Hiện" : "Ẩn"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScopePanel() {
  return (
    <section className="account-panel" aria-labelledby="permission-scope-title">
      <header className="account-panel-header">
        <div>
          <h2 id="permission-scope-title">Phạm vi dữ liệu</h2>
          <p>Kiểm soát ai thấy dữ liệu nào.</p>
        </div>
      </header>

      <div className="permission-scope-list">
        {allScopes.map((scope) => (
          <article className={scope === selectedPermission.scope ? "is-selected" : undefined} key={scope}>
            <span>{scopeLabels[scope]}</span>
            <p>
              {scope === "private"
                ? "Chỉ dữ liệu do mình tạo hoặc phụ trách."
                : scope === "department"
                  ? "Dữ liệu của bản thân và đồng nghiệp cùng phòng ban."
                  : scope === "parent_department"
                    ? "Gồm cả dữ liệu phòng ban cấp dưới trực thuộc."
                    : "Toàn bộ dữ liệu trên hệ thống."}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ConditionPanel() {
  return (
    <section className="account-panel" aria-labelledby="permission-condition-title">
      <header className="account-panel-header">
        <div>
          <h2 id="permission-condition-title">Quyền theo trạng thái/loại</h2>
          <p>{selectedPermission.object} · {selectedPermission.module}</p>
        </div>
      </header>

      <div className="permission-condition-list">
        {selectedPermission.conditions.map((condition) => (
          <article key={condition}>
            <span>
              <Check size={14} weight="duotone" aria-hidden="true" />
            </span>
            <p>{condition}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FieldSecurityPanel() {
  return (
    <section className="account-panel" aria-labelledby="field-security-title">
      <header className="account-panel-header">
        <div>
          <h2 id="field-security-title">Field Level Security</h2>
          <p>Ẩn/hiện hoặc cho sửa từng trường thông tin.</p>
        </div>
      </header>

      <div className="field-security-list">
        {selectedPermission.fieldSecurity.map((field) => (
          <article key={field.field}>
            <div>
              <strong>{field.field}</strong>
              <p>{field.note}</p>
            </div>
            <span className={`field-mode field-mode--${field.mode}`}>{fieldModeLabels[field.mode]}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ToolbarPanel() {
  return (
    <section className="account-panel" aria-labelledby="toolbar-permission-title">
      <header className="account-panel-header">
        <div>
          <h2 id="toolbar-permission-title">Menu & Toolbar</h2>
          <p>Ẩn/hiện menu và các nút thao tác.</p>
        </div>
      </header>

      <div className="toolbar-permission-list">
        <article>
          <span>Menu trái</span>
          <strong>{selectedPermission.menuVisible ? "Đang hiển thị" : "Đang ẩn"}</strong>
        </article>
        {selectedPermission.toolbar.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.enabled ? "Cho phép" : "Không cho phép"}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function MergeRulePanel() {
  return (
    <section className="account-panel" aria-labelledby="merge-rule-title">
      <header className="account-panel-header">
        <div>
          <h2 id="merge-rule-title">Cộng dồn quyền</h2>
          <p>Nếu thuộc nhiều nhóm, hệ thống lấy quyền cao nhất.</p>
        </div>
      </header>

      <div className="merge-rule-list">
        {permissionMergeExamples.map((example) => (
          <article key={example.id}>
            <span>
              <Users size={16} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{example.employee}</h3>
              <p>{example.groups.join(" + ")}</p>
              <strong>{example.result}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SelectedObjectPanel() {
  return (
    <section className="group-example-panel detailed-permission-selected" aria-label="Đối tượng quyền đang chọn">
      <span>
        <Key size={18} weight="duotone" aria-hidden="true" />
      </span>
      <div>
        <h2>{selectedPermission.object}</h2>
        <p>{selectedPermission.summary}</p>
        <div className="permission-selected-meta">
          <span>{selectedPermission.module}</span>
          <span>{selectedPermission.objectCode}</span>
          <span>{scopeLabels[selectedPermission.scope]}</span>
        </div>
      </div>
    </section>
  );
}

export function DetailedPermissionSettingsBoard() {
  return (
    <main className="account-access-page detailed-permission-page" aria-label="Cài đặt quyền chi tiết">
      <section className="org-page-heading" aria-labelledby="detailed-permission-page-title">
        <div>
          <span>Cài đặt hệ thống · Tài khoản người dùng</span>
          <h1 id="detailed-permission-page-title">Quyền chi tiết</h1>
          <p>Can thiệp sâu vào từng đối tượng, hành động, phạm vi dữ liệu, điều kiện, trường thông tin và toolbar.</p>
        </div>
        <a className="secondary-button" href="/admin/settings/accounts/groups">
          Quay lại nhóm
        </a>
      </section>

      <PermissionSummary />

      <section className="account-access-layout" aria-label="Thiết lập quyền chi tiết">
        <div className="account-access-main">
          <ActionPermissionTable />
          <SelectedObjectPanel />
        </div>

        <aside className="account-access-side" aria-label="Chi tiết quyền đang chọn">
          <ScopePanel />
          <ConditionPanel />
          <FieldSecurityPanel />
          <ToolbarPanel />
          <MergeRulePanel />
        </aside>
      </section>
    </main>
  );
}
