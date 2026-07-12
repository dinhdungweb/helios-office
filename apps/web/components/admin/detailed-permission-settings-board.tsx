import {
  Check,
  ClipboardText,
  Key,
  Lock,
  ShieldCheck,
  Star,
  Users
} from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import type {
  AccountAccessData,
  AccountPermission,
  ManagedUserAccount,
  PermissionGroup
} from "@/lib/account-access-api";

const roleLabels = {
  system_admin: "Admin hệ thống",
  user: "User"
};

type PermissionUsageMaps = {
  groupsByPermission: Map<string, PermissionGroup[]>;
  accountsByPermission: Map<string, ManagedUserAccount[]>;
  customAccountsByPermission: Map<string, ManagedUserAccount[]>;
};

function buildPermissionUsageMaps(data: AccountAccessData): PermissionUsageMaps {
  const activeGroups = data.groups.filter((group) => group.status !== "archived");
  const groupsByPermission = new Map<string, PermissionGroup[]>();
  const accountsByPermission = new Map<string, ManagedUserAccount[]>();
  const customAccountsByPermission = new Map<string, ManagedUserAccount[]>();

  for (const permission of data.permissions) {
    groupsByPermission.set(
      permission.key,
      activeGroups.filter((group) => group.permissionKeys.includes(permission.key))
    );
    accountsByPermission.set(
      permission.key,
      data.accounts.filter((account) => account.effectivePermissionKeys.includes(permission.key))
    );
    customAccountsByPermission.set(
      permission.key,
      data.accounts.filter((account) => account.customPermissionKeys.includes(permission.key))
    );
  }

  return { groupsByPermission, accountsByPermission, customAccountsByPermission };
}

function PermissionSummary({
  data,
  usageMaps
}: {
  data: AccountAccessData;
  usageMaps: PermissionUsageMaps;
}) {
  const categories = new Set(data.permissions.map((permission) => permission.category));
  const activeGroups = data.groups.filter((group) => group.status !== "archived");
  const usedPermissionKeys = new Set(activeGroups.flatMap((group) => group.permissionKeys));
  const customOverrideCount = Array.from(usageMaps.customAccountsByPermission.values()).reduce(
    (total, accounts) => total + accounts.length,
    0
  );
  const summaryItems = [
    { label: "Quyền catalog", value: data.permissions.length, icon: ClipboardText },
    { label: "Danh mục", value: categories.size, icon: Key },
    { label: "Đang dùng", value: usedPermissionKeys.size, icon: ShieldCheck },
    { label: "Quyền riêng", value: customOverrideCount, icon: Star }
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

function PermissionCatalogTable({
  data,
  usageMaps,
  selectedPermission
}: {
  data: AccountAccessData;
  usageMaps: PermissionUsageMaps;
  selectedPermission?: AccountPermission;
}) {
  return (
    <section className="account-panel" aria-labelledby="detailed-permission-table-title">
      <header className="account-panel-header">
        <div>
          <h2 id="detailed-permission-table-title">Danh mục quyền</h2>
          <p>{data.permissions.length} quyền từ PermissionDefinition</p>
        </div>
        <div className="account-panel-actions">
          <a className="secondary-button" href="/admin/settings/accounts/groups">
            <Users size={16} weight="duotone" aria-hidden="true" />
            Nhóm quyền
          </a>
          <a className="secondary-button" href="/admin/settings/accounts">
            <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
            Tài khoản
          </a>
        </div>
      </header>

      <div className="account-filter-row" aria-label="Danh mục quyền">
        {Array.from(new Set(data.permissions.map((permission) => permission.category))).map((category, index) => (
          <span className={index === 0 ? "is-selected" : undefined} key={category}>
            {category}
          </span>
        ))}
      </div>

      <div className="group-table-shell" tabIndex={0} aria-label="Bảng quyền chi tiết có thể cuộn ngang">
        <table className="detailed-permission-table">
          <thead>
            <tr>
              <th scope="col">Quyền</th>
              <th scope="col">Danh mục</th>
              <th scope="col">Admin</th>
              <th scope="col">Nhóm dùng</th>
              <th scope="col">Tài khoản hiệu lực</th>
              <th scope="col">Quyền riêng</th>
            </tr>
          </thead>
          <tbody>
            {data.permissions.map((permission) => {
              const groups = usageMaps.groupsByPermission.get(permission.key) ?? [];
              const accounts = usageMaps.accountsByPermission.get(permission.key) ?? [];
              const customAccounts = usageMaps.customAccountsByPermission.get(permission.key) ?? [];

              return (
                <tr className={permission.key === selectedPermission?.key ? "is-selected" : undefined} key={permission.key}>
                  <th scope="row">
                    <strong>{permission.label}</strong>
                    <small>{permission.key}</small>
                  </th>
                  <td>{permission.category}</td>
                  <td>
                    <span className={permission.adminOnly ? "group-action-check is-allowed" : "group-action-check"}>
                      {permission.adminOnly ? (
                        <Check size={14} weight="duotone" aria-label="Quyền quản trị" />
                      ) : (
                        <Lock size={14} weight="duotone" aria-label="Không yêu cầu admin" />
                      )}
                    </span>
                  </td>
                  <td>
                    <Badge className="permission-count" tone="success">{groups.length}</Badge>
                  </td>
                  <td>
                    <Badge className="permission-count" tone="success">{accounts.length}</Badge>
                  </td>
                  <td>
                    {customAccounts.length > 0 ? (
                      <Badge className="permission-count" tone="success">{customAccounts.length}</Badge>
                    ) : (
                      <span className="group-action-check">
                        <Lock size={14} weight="duotone" aria-label="Không có quyền riêng" />
                      </span>
                    )}
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

function CategoryPanel({ permissions }: { permissions: AccountPermission[] }) {
  const categories = Array.from(new Set(permissions.map((permission) => permission.category)));

  return (
    <section className="account-panel" aria-labelledby="permission-category-title">
      <header className="account-panel-header">
        <div>
          <h2 id="permission-category-title">Danh mục</h2>
          <p>{categories.length} nhóm quyền nghiệp vụ</p>
        </div>
      </header>

      <div className="toolbar-permission-list">
        {categories.map((category) => (
          <article key={category}>
            <span>{category}</span>
            <strong>{permissions.filter((permission) => permission.category === category).length} quyền</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function GroupUsagePanel({
  selectedPermission,
  usageMaps
}: {
  selectedPermission?: AccountPermission;
  usageMaps: PermissionUsageMaps;
}) {
  const groups = selectedPermission ? usageMaps.groupsByPermission.get(selectedPermission.key) ?? [] : [];

  return (
    <section className="account-panel" aria-labelledby="group-usage-title">
      <header className="account-panel-header">
        <div>
          <h2 id="group-usage-title">Nhóm đang dùng</h2>
          <p>{selectedPermission?.label ?? "Chưa có quyền"}</p>
        </div>
      </header>

      <div className="merge-rule-list">
        {groups.map((group) => (
          <article key={group.id}>
            <span>
              <Users size={16} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{group.name}</h3>
              <p>{roleLabels[group.role]} · {group.memberCount} người</p>
              <strong>{group.permissionKeys.length} quyền cấu hình</strong>
            </div>
          </article>
        ))}
        {groups.length === 0 ? (
          <article>
            <span>
              <Lock size={16} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>Chưa có nhóm</h3>
              <p>Quyền này chưa được gán vào nhóm active nào.</p>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function EffectiveAccountPanel({
  selectedPermission,
  usageMaps
}: {
  selectedPermission?: AccountPermission;
  usageMaps: PermissionUsageMaps;
}) {
  const accounts = selectedPermission ? usageMaps.accountsByPermission.get(selectedPermission.key) ?? [] : [];
  const visibleAccounts = accounts.slice(0, 6);

  return (
    <section className="account-panel" aria-labelledby="effective-account-title">
      <header className="account-panel-header">
        <div>
          <h2 id="effective-account-title">Tài khoản hiệu lực</h2>
          <p>{accounts.length} tài khoản active có quyền này</p>
        </div>
      </header>

      <div className="custom-permission-list">
        {visibleAccounts.map((account) => (
          <article className="custom-permission-row" key={account.id}>
            <span className="account-avatar">
              <span>{account.avatar}</span>
            </span>
            <div>
              <h3>{account.name}</h3>
              <p>{account.title} · {account.email}</p>
            </div>
          </article>
        ))}
        {accounts.length > visibleAccounts.length ? (
          <p className="account-empty-state">+{accounts.length - visibleAccounts.length} tài khoản khác.</p>
        ) : null}
        {accounts.length === 0 ? <p className="account-empty-state">Chưa có tài khoản hiệu lực.</p> : null}
      </div>
    </section>
  );
}

function CustomOverridePanel({ data }: { data: AccountAccessData }) {
  const customAccounts = data.accounts.filter((account) => account.customPermissionKeys.length > 0);

  return (
    <section className="account-panel" aria-labelledby="custom-override-title">
      <header className="account-panel-header">
        <div>
          <h2 id="custom-override-title">Quyền riêng</h2>
          <p>{customAccounts.length} tài khoản có override</p>
        </div>
      </header>

      <div className="merge-rule-list">
        {customAccounts.map((account) => (
          <article key={account.id}>
            <span>
              <Star size={16} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{account.name}</h3>
              <p>{account.customPermissionKeys.length} quyền riêng</p>
              <strong>{account.customPermissionNote ?? "Không có ghi chú."}</strong>
            </div>
          </article>
        ))}
        {customAccounts.length === 0 ? (
          <article>
            <span>
              <Lock size={16} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>Không có override</h3>
              <p>Tất cả tài khoản đang dùng quyền theo nhóm.</p>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function SelectedPermissionPanel({ permission }: { permission?: AccountPermission }) {
  if (!permission) {
    return null;
  }

  return (
    <section className="group-example-panel detailed-permission-selected" aria-label="Quyền đang chọn">
      <span>
        <Key size={18} weight="duotone" aria-hidden="true" />
      </span>
      <div>
        <h2>{permission.label}</h2>
        <p>{permission.key}</p>
        <div className="permission-selected-meta">
          <span>{permission.category}</span>
          <span>{permission.adminOnly ? "Admin only" : "User scope"}</span>
        </div>
      </div>
    </section>
  );
}

function ApiStatusBanner({ data }: { data: AccountAccessData }) {
  if (data.source === "api") {
    return null;
  }

  return (
    <section className="account-api-banner" role="status">
      <strong>Chưa kết nối được Account API</strong>
      <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
    </section>
  );
}

export function DetailedPermissionSettingsBoard({ data }: { data: AccountAccessData }) {
  const usageMaps = buildPermissionUsageMaps(data);
  const selectedPermission = data.permissions[0];

  return (
    <main className="account-access-page detailed-permission-page" aria-label="Cài đặt quyền chi tiết">
      <ApiStatusBanner data={data} />

      <section className="org-page-heading" aria-labelledby="detailed-permission-page-title">
        <div>
          <span>Cài đặt hệ thống · Tài khoản người dùng</span>
          <h1 id="detailed-permission-page-title">Quyền chi tiết</h1>
          <p>Danh mục quyền đang được lấy từ PermissionDefinition và đối chiếu với nhóm quyền, tài khoản hiệu lực, quyền riêng.</p>
        </div>
        <a className="secondary-button" href="/admin/settings/accounts/groups">
          Quay lại nhóm
        </a>
      </section>

      <PermissionSummary data={data} usageMaps={usageMaps} />

      <section className="account-access-layout" aria-label="Thiết lập quyền chi tiết">
        <div className="account-access-main">
          <PermissionCatalogTable data={data} usageMaps={usageMaps} selectedPermission={selectedPermission} />
          <SelectedPermissionPanel permission={selectedPermission} />
        </div>

        <aside className="account-access-side" aria-label="Đối chiếu quyền đang chọn">
          <CategoryPanel permissions={data.permissions} />
          <GroupUsagePanel selectedPermission={selectedPermission} usageMaps={usageMaps} />
          <EffectiveAccountPanel selectedPermission={selectedPermission} usageMaps={usageMaps} />
          <CustomOverridePanel data={data} />
        </aside>
      </section>
    </main>
  );
}
