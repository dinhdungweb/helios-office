import {
  CheckCircle,
  Clock,
  FunnelSimple,
  Lock,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
  X
} from "@/lib/icons";
import { AccountEditDialog } from "@/components/admin/account-editor-dialog";
import { AccountProvisionDialog } from "@/components/admin/account-provision-dialog";
import { AccountManagedTable } from "@/components/admin/account-table-client";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type {
  AccountAccessData,
  AccountLifecycleStatus,
  AccountPermission,
  AccountRole,
  ManagedUserAccount,
  PermissionGroup
} from "@/lib/account-access-api";
import { activateAccountAction, closeAccountAction } from "@/lib/account-access-actions";

const roleLabels: Record<AccountRole, string> = {
  system_admin: "Admin",
  user: "User"
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

const statusTones: Record<AccountLifecycleStatus, BadgeTone> = {
  active: "success",
  closed: "danger",
  pending_activation: "warning"
};

type AccountAccessMaps = {
  permissionByKey: Map<string, AccountPermission>;
  permissionCategories: string[];
};

function AccountStatusBadge({ status }: { status: AccountLifecycleStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <Badge
      className={`account-status account-status--${status}`}
      icon={<StatusIcon size={14} weight="duotone" aria-hidden="true" />}
      tone={statusTones[status]}
    >
      {statusLabels[status]}
    </Badge>
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

function AccountRowActions({
  account,
  groups,
  permissions
}: {
  account: ManagedUserAccount;
  groups: PermissionGroup[];
  permissions: AccountPermission[];
}) {
  return (
    <div className="account-row-actions">
      {account.status !== "active" ? (
        <form action={activateAccountAction}>
          <input name="accountId" type="hidden" value={account.id} />
          <button className="icon-button" type="submit" aria-label={`Kích hoạt ${account.name}`} title="Kích hoạt">
            <CheckCircle size={16} weight="duotone" aria-hidden="true" />
          </button>
        </form>
      ) : null}
      {account.status !== "closed" ? (
        <form action={closeAccountAction}>
          <input name="accountId" type="hidden" value={account.id} />
          <button className="icon-button" type="submit" aria-label={`Đóng ${account.name}`} title="Đóng tài khoản">
            <X size={16} weight="duotone" aria-hidden="true" />
          </button>
        </form>
      ) : null}
      <AccountEditDialog account={account} groups={groups} permissions={permissions} />
    </div>
  );
}

function SummaryStrip({ summary }: { summary: AccountAccessData["summary"] }) {
  const summaryItems = [
    { label: "Tài khoản hoạt động", value: summary.activeAccounts, icon: Users },
    { label: "Admin hệ thống", value: summary.systemAdmins, icon: ShieldCheck },
    { label: "Chờ kích hoạt", value: summary.pendingActivation, icon: Clock },
    { label: "Quyền cá nhân", value: summary.customizedAccounts, icon: Star }
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

function PermissionGroupsPanel({ groups }: { groups: PermissionGroup[] }) {
  return (
    <section className="account-panel" aria-labelledby="permission-groups-title">
      <header className="account-panel-header">
        <div>
          <h2 id="permission-groups-title">Nhóm quyền</h2>
          <p>{groups.length} nhóm đang áp dụng</p>
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
        {groups.map((group) => (
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
                <Badge tone={group.role === "system_admin" ? "accent" : "neutral"}>{roleLabels[group.role]}</Badge>
                <Badge tone="neutral">{group.memberCount} người</Badge>
              </div>
            </div>
          </article>
        ))}
        {groups.length === 0 ? <p className="account-empty-state">Chưa có nhóm quyền từ API.</p> : null}
      </div>
    </section>
  );
}

function PermissionMatrixPanel({
  groups,
  maps
}: {
  groups: PermissionGroup[];
  maps: AccountAccessMaps;
}) {
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
              {maps.permissionCategories.map((category) => (
                <th scope="col" key={category}>{category}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id}>
                <th scope="row">
                  <span className="permission-group-cell">
                    <strong>{group.name}</strong>
                  </span>
                </th>
                {maps.permissionCategories.map((category) => {
                  const count = group.permissionKeys.filter((permissionKey) => {
                    const permission = maps.permissionByKey.get(permissionKey);
                    return permission?.category === category;
                  }).length;

                  return (
                    <td key={`${group.id}-${category}`}>
                      {count > 0 ? (
                        <Badge className="permission-count" tone="success">{count}</Badge>
                      ) : (
                        <Lock size={15} weight="duotone" aria-label="Không có quyền" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {groups.length === 0 ? (
              <tr>
                <td colSpan={Math.max(maps.permissionCategories.length + 1, 1)}>
                  <span className="account-empty-state">Chưa có ma trận quyền từ API.</span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CustomPermissionPanel({ accounts }: { accounts: ManagedUserAccount[] }) {
  const customAccounts = accounts.filter((account) => account.customPermissionKeys.length > 0);

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
        {customAccounts.length === 0 ? <p className="account-empty-state">Chưa có quyền cá nhân.</p> : null}
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

export function AccountAccessBoard({ data }: { data: AccountAccessData }) {
  const activeGroups = data.groups.filter((group) => group.status !== "archived");
  const maps: AccountAccessMaps = {
    permissionByKey: new Map(data.permissions.map((permission) => [permission.key, permission])),
    permissionCategories: Array.from(new Set(data.permissions.map((permission) => permission.category)))
  };

  return (
    <main className="account-access-page" aria-label="Quản trị tài khoản và quyền">
      <ApiStatusBanner data={data} />
      <SummaryStrip summary={data.summary} />

      <section className="account-access-layout" aria-label="Thiết lập tài khoản">
        <div className="account-access-main">
          <AccountManagedTable
            accounts={data.accounts}
            availableEmployees={data.availableEmployees}
            groups={activeGroups}
            permissions={data.permissions}
          />
          <PermissionMatrixPanel groups={activeGroups} maps={maps} />
        </div>

        <aside className="account-access-side" aria-label="Nhóm quyền và quyền riêng">
          <PermissionGroupsPanel groups={activeGroups} />
          <CustomPermissionPanel accounts={data.accounts} />
        </aside>
      </section>
    </main>
  );
}
