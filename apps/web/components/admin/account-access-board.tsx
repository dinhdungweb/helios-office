import {
  CheckCircle,
  Clock,
  FunnelSimple,
  Key,
  Lock,
  PencilSimple,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
  X
} from "@/lib/icons";
import {
  accountLicenses,
  accountPermissions,
  managedUserAccounts,
  permissionGroups,
  type AccountLifecycleStatus,
  type AccountLicensePlan,
  type AccountRole,
  type ManagedUserAccount
} from "@/lib/mock-data";

const roleLabels: Record<AccountRole, string> = {
  system_admin: "Admin",
  user: "User"
};

const licenseLabels: Record<AccountLicensePlan, string> = {
  standard: "STANDARD",
  professional: "PROFESSIONAL",
  enterprise: "ENTERPRISE"
};

const statusLabels: Record<AccountLifecycleStatus, string> = {
  pending_activation: "Chưa kích hoạt",
  active: "Đang hoạt động",
  closed: "Đã đóng"
};

const statusIcons = {
  pending_activation: Clock,
  active: CheckCircle,
  closed: X
};

const groupById = new Map(permissionGroups.map((group) => [group.id, group]));
const permissionByKey = new Map(accountPermissions.map((permission) => [permission.key, permission]));
const permissionCategories = Array.from(new Set(accountPermissions.map((permission) => permission.category)));

function getEffectivePermissions(account: ManagedUserAccount) {
  const group = groupById.get(account.groupId);
  const permissionKeys = Array.from(
    new Set([...(group?.permissionKeys ?? []), ...account.customPermissionKeys])
  );

  return permissionKeys
    .map((permissionKey) => permissionByKey.get(permissionKey))
    .filter(Boolean);
}

function AccountStatusBadge({ status }: { status: AccountLifecycleStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <span className={`account-status account-status--${status}`}>
      <StatusIcon size={14} weight="duotone" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function AccountAvatar({ account }: { account: ManagedUserAccount }) {
  const hasCustomPermissions = account.customPermissionKeys.length > 0;

  return (
    <span className="account-avatar">
      <span>{account.avatar}</span>
      {hasCustomPermissions ? (
        <span className="account-avatar-star" aria-label="Có quyền tùy chỉnh riêng">
          <Star size={12} weight="fill" aria-hidden="true" />
        </span>
      ) : null}
    </span>
  );
}

function SummaryStrip() {
  const activeAccounts = managedUserAccounts.filter((account) => account.status === "active").length;
  const adminAccounts = managedUserAccounts.filter((account) => account.role === "system_admin").length;
  const billableLicenses = managedUserAccounts.filter((account) => account.status !== "closed").length;
  const customAccounts = managedUserAccounts.filter((account) => account.customPermissionKeys.length > 0).length;
  const summaryItems = [
    { label: "Tài khoản hoạt động", value: activeAccounts, icon: Users },
    { label: "Admin hệ thống", value: adminAccounts, icon: ShieldCheck },
    { label: "License tính phí", value: billableLicenses, icon: Key },
    { label: "Quyền cá nhân", value: customAccounts, icon: Star }
  ];

  return (
    <section className="account-summary-grid" aria-label="Tổng quan tài khoản">
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

function AccountTable() {
  return (
    <section className="account-panel account-table-panel" aria-labelledby="account-table-title">
      <header className="account-panel-header">
        <div>
          <h2 id="account-table-title">Tài khoản người dùng</h2>
          <p>{managedUserAccounts.length} hồ sơ đăng nhập</p>
        </div>
        <div className="account-panel-actions">
          <a className="secondary-button" href="/admin/settings/accounts/device-auth">
            <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
            Xác thực thiết bị
          </a>
          <button className="secondary-button" type="button">
            <FunnelSimple size={16} weight="duotone" aria-hidden="true" />
            Bộ lọc
          </button>
          <button className="secondary-button" type="button">
            <SlidersHorizontal size={16} weight="duotone" aria-hidden="true" />
            Cột
          </button>
          <button className="primary-button" type="button">
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Cấp tài khoản
          </button>
        </div>
      </header>

      <div className="account-filter-row" aria-label="Bộ lọc nhanh">
        {(["active", "pending_activation", "closed"] as const).map((status) => (
          <button className={status === "active" ? "is-selected" : undefined} type="button" key={status}>
            {statusLabels[status]}
          </button>
        ))}
        {accountLicenses.map((license) => (
          <button type="button" key={license.key}>
            {license.name}
          </button>
        ))}
      </div>

      <div className="account-table-shell" tabIndex={0} aria-label="Bảng tài khoản có thể cuộn ngang">
        <table className="account-table">
          <thead>
            <tr>
              <th scope="col">Nhân sự</th>
              <th scope="col">Quyền</th>
              <th scope="col">License</th>
              <th scope="col">Nhóm quyền</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Hiệu lực</th>
              <th scope="col">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {managedUserAccounts.map((account) => {
              const group = groupById.get(account.groupId);
              const permissions = getEffectivePermissions(account);

              return (
                <tr key={account.id}>
                  <th scope="row">
                    <span className="account-person-cell">
                      <AccountAvatar account={account} />
                      <span>
                        <strong>{account.name}</strong>
                        <small>{account.employeeCode ?? "Chưa có mã"} · {account.email}</small>
                      </span>
                    </span>
                  </th>
                  <td>
                    <span className={`account-role account-role--${account.role}`}>
                      {roleLabels[account.role]}
                    </span>
                    <small>{account.title}</small>
                  </td>
                  <td>
                    <span className={`account-license account-license--${account.licensePlan}`}>
                      {licenseLabels[account.licensePlan]}
                    </span>
                  </td>
                  <td>
                    <strong>{group?.name ?? "Chưa gán"}</strong>
                    <small>{permissions.length} quyền hiệu lực</small>
                  </td>
                  <td>
                    <AccountStatusBadge status={account.status} />
                    {account.status === "closed" ? <small>Không tính phí license</small> : null}
                  </td>
                  <td>
                    <span>{account.activatedAt ?? "Chờ cấp"}</span>
                    {account.closedAt ? <small>Đóng: {account.closedAt}</small> : null}
                  </td>
                  <td>
                    <button className="icon-button" type="button" aria-label={`Chỉnh quyền ${account.name}`}>
                      <PencilSimple size={16} weight="duotone" aria-hidden="true" />
                    </button>
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

function PermissionGroupsPanel() {
  return (
    <section className="account-panel" aria-labelledby="permission-groups-title">
      <header className="account-panel-header">
        <div>
          <h2 id="permission-groups-title">Nhóm quyền</h2>
          <p>{permissionGroups.length} nhóm đang áp dụng</p>
        </div>
        <div className="account-panel-actions">
          <a className="secondary-button" href="/admin/settings/accounts/groups">
            <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
            Quản lý nhóm
          </a>
          <button className="icon-button" type="button" aria-label="Tạo nhóm quyền">
            <Plus size={16} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="permission-group-list">
        {permissionGroups.map((group) => (
          <article className="permission-group-row" key={group.id}>
            <span className={`permission-group-icon permission-group-icon--${group.role}`}>
              {group.role === "system_admin" ? (
                <ShieldCheck size={18} weight="duotone" aria-hidden="true" />
              ) : (
                <Users size={18} weight="duotone" aria-hidden="true" />
              )}
            </span>
            <div>
              <h3>{group.name}</h3>
              <p>{group.summary}</p>
              <div>
                <span>{roleLabels[group.role]}</span>
                <span>{licenseLabels[group.licensePlan]}</span>
                <span>{group.memberCount} người</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function LicenseUsagePanel() {
  return (
    <section className="account-panel" aria-labelledby="license-usage-title">
      <header className="account-panel-header">
        <div>
          <h2 id="license-usage-title">License</h2>
          <p>Không tính tài khoản đã đóng</p>
        </div>
      </header>

      <div className="license-usage-list">
        {accountLicenses.map((license) => {
          const used = managedUserAccounts.filter(
            (account) => account.licensePlan === license.key && account.status !== "closed"
          ).length;
          const usage = Math.round((used / license.seatLimit) * 100);

          return (
            <article className="license-usage-row" key={license.key}>
              <header>
                <strong>{license.name}</strong>
                <span>{used}/{license.seatLimit}</span>
              </header>
              <div className="license-usage-track" aria-hidden="true">
                <span style={{ width: `${usage}%` }} />
              </div>
              <p>{license.modules.join(" · ")}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PermissionMatrixPanel() {
  return (
    <section className="account-panel account-matrix-panel" aria-labelledby="permission-matrix-title">
      <header className="account-panel-header">
        <div>
          <h2 id="permission-matrix-title">Ma trận quyền</h2>
          <p>Theo nhóm người dùng</p>
        </div>
        <a className="secondary-button" href="/admin/settings/accounts/permissions">
          <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
          Quyền chi tiết
        </a>
      </header>

      <div className="permission-matrix-shell" tabIndex={0} aria-label="Ma trận quyền có thể cuộn ngang">
        <table className="permission-matrix-table">
          <thead>
            <tr>
              <th scope="col">Nhóm</th>
              {permissionCategories.map((category) => (
                <th scope="col" key={category}>{category}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionGroups.map((group) => (
              <tr key={group.id}>
                <th scope="row">
                  <span className="permission-group-cell">
                    <strong>{group.name}</strong>
                    <small>{licenseLabels[group.licensePlan]}</small>
                  </span>
                </th>
                {permissionCategories.map((category) => {
                  const count = group.permissionKeys.filter((permissionKey) => {
                    const permission = permissionByKey.get(permissionKey);
                    return permission?.category === category;
                  }).length;

                  return (
                    <td key={`${group.id}-${category}`}>
                      {count > 0 ? (
                        <span className="permission-count">{count}</span>
                      ) : (
                        <Lock size={15} weight="duotone" aria-label="Không có quyền" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CustomPermissionPanel() {
  const customAccounts = managedUserAccounts.filter((account) => account.customPermissionKeys.length > 0);

  return (
    <section className="account-panel" aria-labelledby="custom-permission-title">
      <header className="account-panel-header">
        <div>
          <h2 id="custom-permission-title">Quyền cá nhân</h2>
          <p>{customAccounts.length} tài khoản có dấu sao</p>
        </div>
      </header>

      <div className="custom-permission-list">
        {customAccounts.map((account) => (
          <article className="custom-permission-row" key={account.id}>
            <AccountAvatar account={account} />
            <div>
              <h3>{account.name}</h3>
              <p>{account.customPermissionNote}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AccountAccessBoard() {
  return (
    <main className="account-access-page" aria-label="Quản trị tài khoản và quyền">
      <SummaryStrip />

      <section className="account-access-layout" aria-label="Thiết lập tài khoản">
        <div className="account-access-main">
          <AccountTable />
          <PermissionMatrixPanel />
        </div>

        <aside className="account-access-side" aria-label="Nhóm quyền và license">
          <PermissionGroupsPanel />
          <LicenseUsagePanel />
          <CustomPermissionPanel />
        </aside>
      </section>
    </main>
  );
}
