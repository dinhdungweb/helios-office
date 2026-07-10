import {
  Check,
  CheckCircle,
  ClipboardText,
  Eye,
  FunnelSimple,
  Key,
  List,
  Lock,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Users
} from "@/lib/icons";
import {
  accountLicenses,
  permissionGroups,
  type AccountLicensePlan,
  type PermissionGroup
} from "@/lib/mock-data";

type PermissionAction = PermissionGroup["permissionRules"][number]["actions"][number];
type PermissionScope = PermissionGroup["permissionRules"][number]["scope"];

const licenseLabels: Record<AccountLicensePlan, string> = {
  standard: "STANDARD",
  professional: "PROFESSIONAL",
  enterprise: "ENTERPRISE"
};

const scopeLabels: Record<PermissionGroup["dataScope"], string> = {
  personal: "Cá nhân",
  department: "Phòng ban",
  company: "Toàn công ty",
  selected_departments: "Phòng ban được chọn"
};

const permissionScopeLabels: Record<PermissionScope, string> = {
  personal: "Cá nhân",
  department: "Phòng ban",
  company: "Toàn công ty"
};

const memberSourceLabels: Record<PermissionGroup["memberSources"][number]["type"], string> = {
  person: "Đích danh",
  department: "Phòng ban",
  title: "Chức vụ"
};

const actionLabels: Record<PermissionAction, string> = {
  view: "Xem",
  create: "Thêm",
  edit: "Sửa",
  delete: "Xóa",
  manage: "Quản lý"
};

const allActions: PermissionAction[] = ["view", "create", "edit", "delete", "manage"];
const selectedGroup = permissionGroups.find((group) => group.id === "grp-project-managers") ?? permissionGroups[0];

function GroupStatusBadge({ status }: { status: PermissionGroup["status"] }) {
  return (
    <span className={status === "active" ? "group-status group-status--active" : "group-status group-status--paused"}>
      <CheckCircle size={14} weight="duotone" aria-hidden="true" />
      {status === "active" ? "Đang hoạt động" : "Tạm tắt"}
    </span>
  );
}

function UserGroupSummary() {
  const totalMembers = permissionGroups.reduce((total, group) => total + group.memberCount, 0);
  const activeGroups = permissionGroups.filter((group) => group.status === "active").length;
  const permissionObjects = permissionGroups.reduce((total, group) => total + group.permissionRules.length, 0);
  const summaryItems = [
    { label: "Nhóm quyền", value: permissionGroups.length, icon: Users },
    { label: "Đang hoạt động", value: activeGroups, icon: CheckCircle },
    { label: "Thành viên áp dụng", value: totalMembers, icon: ShieldCheck },
    { label: "Đối tượng quyền", value: permissionObjects, icon: Key }
  ];

  return (
    <section className="account-summary-grid" aria-label="Tổng quan nhóm người dùng">
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

function GroupDirectoryPanel() {
  return (
    <section className="account-panel" aria-labelledby="group-directory-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-directory-title">Danh sách nhóm người dùng</h2>
          <p>Tạo nhóm theo vai trò, phòng ban hoặc chức vụ để phân quyền nhanh.</p>
        </div>
        <div className="account-panel-actions">
          <button className="secondary-button" type="button">
            <FunnelSimple size={16} weight="duotone" aria-hidden="true" />
            Bộ lọc
          </button>
          <button className="primary-button" type="button">
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Tạo nhóm
          </button>
        </div>
      </header>

      <div className="account-filter-row" aria-label="Bộ lọc nhóm người dùng">
        <button className="is-selected" type="button">Tất cả nhóm</button>
        <button type="button">Đang hoạt động</button>
        <button type="button">Theo phòng ban</button>
        <button type="button">Theo chức vụ</button>
        {accountLicenses.map((license) => (
          <button type="button" key={license.key}>{license.name}</button>
        ))}
      </div>

      <div className="group-table-shell" tabIndex={0} aria-label="Bảng nhóm người dùng có thể cuộn ngang">
        <table className="group-directory-table">
          <thead>
            <tr>
              <th scope="col">Nhóm</th>
              <th scope="col">Mã nhóm</th>
              <th scope="col">Thành viên</th>
              <th scope="col">Phạm vi dữ liệu</th>
              <th scope="col">License</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {permissionGroups.map((group) => (
              <tr className={group.id === selectedGroup.id ? "is-selected" : undefined} key={group.id}>
                <th scope="row">
                  <strong>{group.name}</strong>
                  <small>{group.summary}</small>
                </th>
                <td><code>{group.code}</code></td>
                <td>
                  <strong>{group.memberCount} người</strong>
                  <small>{group.memberSources.map((source) => source.label).join(" · ")}</small>
                </td>
                <td>{scopeLabels[group.dataScope]}</td>
                <td>{licenseLabels[group.licensePlan]}</td>
                <td><GroupStatusBadge status={group.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PermissionMatrixEditor() {
  return (
    <section className="account-panel" aria-labelledby="group-matrix-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-matrix-title">Ma trận quyền: {selectedGroup.name}</h2>
          <p>Tích chọn quyền thao tác và phạm vi dữ liệu cho từng đối tượng.</p>
        </div>
        <div className="account-panel-actions">
          <a className="secondary-button" href="/admin/settings/accounts/permissions">
            <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
            Quyền chi tiết
          </a>
          <button className="secondary-button" type="button">
            <SlidersHorizontal size={16} weight="duotone" aria-hidden="true" />
            Cột quyền
          </button>
          <button className="primary-button" type="button">
            <CheckCircle size={16} weight="duotone" aria-hidden="true" />
            Lưu quyền
          </button>
        </div>
      </header>

      <div className="group-table-shell" tabIndex={0} aria-label="Ma trận phân quyền nhóm có thể cuộn ngang">
        <table className="group-permission-table">
          <thead>
            <tr>
              <th scope="col">Đối tượng</th>
              <th scope="col">Module</th>
              {allActions.map((action) => (
                <th scope="col" key={action}>{actionLabels[action]}</th>
              ))}
              <th scope="col">Scope</th>
            </tr>
          </thead>
          <tbody>
            {selectedGroup.permissionRules.map((rule) => (
              <tr key={`${rule.module}-${rule.object}`}>
                <th scope="row">
                  <strong>{rule.object}</strong>
                </th>
                <td>{rule.module}</td>
                {allActions.map((action) => {
                  const isAllowed = rule.actions.includes(action);

                  return (
                    <td key={action}>
                      <span className={isAllowed ? "group-action-check is-allowed" : "group-action-check"}>
                        {isAllowed ? (
                          <Check size={14} weight="duotone" aria-label={`Có quyền ${actionLabels[action]}`} />
                        ) : (
                          <Lock size={14} weight="duotone" aria-label={`Không có quyền ${actionLabels[action]}`} />
                        )}
                      </span>
                    </td>
                  );
                })}
                <td>
                  <span className={`group-scope-pill group-scope-pill--${rule.scope}`}>
                    {permissionScopeLabels[rule.scope]}
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

function GroupIdentityPanel() {
  return (
    <section className="account-panel" aria-labelledby="group-identity-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-identity-title">{selectedGroup.name}</h2>
          <p>{selectedGroup.code} · {licenseLabels[selectedGroup.licensePlan]}</p>
        </div>
        <GroupStatusBadge status={selectedGroup.status} />
      </header>

      <div className="group-detail-list">
        <article>
          <span><Users size={17} weight="duotone" aria-hidden="true" /></span>
          <div>
            <h3>Thành viên</h3>
            <p>{selectedGroup.memberCount} người đang áp dụng nhóm này</p>
          </div>
        </article>
        <article>
          <span><Eye size={17} weight="duotone" aria-hidden="true" /></span>
          <div>
            <h3>Phạm vi xem</h3>
            <p>{scopeLabels[selectedGroup.dataScope]}</p>
          </div>
        </article>
        <article>
          <span><Key size={17} weight="duotone" aria-hidden="true" /></span>
          <div>
            <h3>Quyền hiệu lực</h3>
            <p>{selectedGroup.permissionRules.length} đối tượng được cấu hình</p>
          </div>
        </article>
      </div>
    </section>
  );
}

function MemberSourcePanel() {
  return (
    <section className="account-panel" aria-labelledby="group-member-source-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-member-source-title">Cách thêm thành viên</h2>
          <p>Gán theo người, phòng ban hoặc chức vụ.</p>
        </div>
      </header>

      <div className="group-source-list">
        {selectedGroup.memberSources.map((source) => (
          <article key={`${source.type}-${source.label}`}>
            <span>{memberSourceLabels[source.type]}</span>
            <strong>{source.label}</strong>
            <p>{source.count} người</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DataScopePanel() {
  return (
    <section className="account-panel" aria-labelledby="group-data-scope-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-data-scope-title">Phạm vi dữ liệu</h2>
          <p>Nhóm được nhìn thấy dữ liệu của phòng ban nào.</p>
        </div>
      </header>

      <div className="group-chip-list">
        {selectedGroup.visibleDepartments.map((department) => (
          <span key={department}>{department}</span>
        ))}
      </div>
    </section>
  );
}

function MenuVisibilityPanel() {
  return (
    <section className="account-panel" aria-labelledby="group-menu-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-menu-title">Menu hiển thị</h2>
          <p>Ẩn/hiện module trên thanh menu trái.</p>
        </div>
      </header>

      <div className="group-menu-visibility">
        <div>
          <h3>Đang hiện</h3>
          <div className="group-chip-list">
            {selectedGroup.visibleMenus.map((menu) => (
              <span key={menu}>{menu}</span>
            ))}
          </div>
        </div>
        <div>
          <h3>Đang ẩn</h3>
          <div className="group-chip-list group-chip-list--muted">
            {selectedGroup.hiddenMenus.map((menu) => (
              <span key={menu}>{menu}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GroupToolsPanel() {
  const tools = [
    {
      title: "Nhân bản nhóm",
      body: "Copy quyền từ nhóm hiện tại để tạo nhóm mới rồi chỉnh lại vài điểm.",
      icon: ClipboardText
    },
    {
      title: "Bật/Tắt hoạt động",
      body: "Tạm dừng nhóm mà không xóa lịch sử hoặc cấu hình đã có.",
      icon: CheckCircle
    },
    {
      title: "Kiểm tra xung đột",
      body: "Rà quyền cá nhân đang ghi đè quyền nhóm trước khi lưu.",
      icon: ShieldCheck
    }
  ];

  return (
    <section className="account-panel" aria-labelledby="group-tools-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-tools-title">Tính năng bổ trợ</h2>
          <p>Thao tác nhanh cho Admin khi quản lý nhóm.</p>
        </div>
      </header>

      <div className="group-tool-list">
        {tools.map((tool) => (
          <article key={tool.title}>
            <span>
              <tool.icon size={17} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{tool.title}</h3>
              <p>{tool.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function GroupExamplePanel() {
  return (
    <section className="group-example-panel" aria-label="Ví dụ cài đặt nhóm">
      <span>
        <List size={18} weight="duotone" aria-hidden="true" />
      </span>
      <div>
        <h2>Ví dụ: Quản lý dự án</h2>
        <p>Nhóm này gồm các trưởng bộ phận, có quyền xem/sửa/quản lý Dự án và Công việc trong phạm vi phòng ban. Kết quả là họ quản lý được dự án của nhân sự cấp dưới nhưng không thấy dự án của phòng ban khác.</p>
      </div>
    </section>
  );
}

export function UserGroupSettingsBoard() {
  return (
    <main className="account-access-page user-group-page" aria-label="Cài đặt nhóm người dùng">
      <section className="org-page-heading" aria-labelledby="user-group-page-title">
        <div>
          <span>Cài đặt hệ thống · Tài khoản người dùng</span>
          <h1 id="user-group-page-title">Nhóm người dùng</h1>
          <p>Tạo nhóm vai trò, gán thành viên và cấu hình ma trận quyền theo thao tác, phạm vi dữ liệu và menu hiển thị.</p>
        </div>
        <a className="secondary-button" href="/admin/settings/accounts">
          Quay lại tài khoản
        </a>
      </section>

      <UserGroupSummary />

      <section className="account-access-layout user-group-layout" aria-label="Thiết lập nhóm người dùng">
        <div className="account-access-main">
          <GroupDirectoryPanel />
          <PermissionMatrixEditor />
          <GroupExamplePanel />
        </div>

        <aside className="account-access-side" aria-label="Chi tiết nhóm đang chọn">
          <GroupIdentityPanel />
          <MemberSourcePanel />
          <DataScopePanel />
          <MenuVisibilityPanel />
          <GroupToolsPanel />
        </aside>
      </section>
    </main>
  );
}
