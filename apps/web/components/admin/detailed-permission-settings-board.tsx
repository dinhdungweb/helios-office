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
  system_admin: "Admin há»‡ thá»‘ng",
  user: "User"
};

type PermissionUsageMaps = {
  groupsByPermission: Map<string, PermissionGroup[]>;
  accountsByPermission: Map<string, ManagedUserAccount[]>;
  customAccountsByPermission: Map<string, ManagedUserAccount[]>;
};

function visibleCatalogPermissions(permissions: AccountPermission[]) {
  return permissions.filter((permission) => !permission.key.startsWith("permission."));
}

function buildPermissionUsageMaps(data: AccountAccessData): PermissionUsageMaps {
  const activeGroups = data.groups.filter((group) => group.status !== "archived");
  const groupsByPermission = new Map<string, PermissionGroup[]>();
  const accountsByPermission = new Map<string, ManagedUserAccount[]>();
  const customAccountsByPermission = new Map<string, ManagedUserAccount[]>();

  for (const permission of visibleCatalogPermissions(data.permissions)) {
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
  const categories = new Set(visibleCatalogPermissions(data.permissions).map((permission) => permission.category));
  const activeGroups = data.groups.filter((group) => group.status !== "archived");
  const usedPermissionKeys = new Set(activeGroups.flatMap((group) => group.permissionKeys));
  const customOverrideCount = Array.from(usageMaps.customAccountsByPermission.values()).reduce(
    (total, accounts) => total + accounts.length,
    0
  );
  const summaryItems = [
    { label: "Quyá»n catalog", value: visibleCatalogPermissions(data.permissions).length, icon: ClipboardText },
    { label: "Danh má»¥c", value: categories.size, icon: Key },
    { label: "Äang dÃ¹ng", value: usedPermissionKeys.size, icon: ShieldCheck },
    { label: "Quyá»n riÃªng", value: customOverrideCount, icon: Star }
  ];

  return (
    <section className="account-summary-grid" aria-label="Tá»•ng quan quyá»n chi tiáº¿t">
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
          <h2 id="detailed-permission-table-title">Danh má»¥c quyá»n</h2>
          <p>{visibleCatalogPermissions(data.permissions).length} quyá»n tá»« PermissionDefinition</p>
        </div>
        <div className="account-panel-actions">
          <a className="secondary-button" href="/admin/settings/accounts/groups">
            <Users size={16} weight="duotone" aria-hidden="true" />
            NhÃ³m quyá»n
          </a>
          <a className="secondary-button" href="/admin/settings/accounts">
            <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
            TÃ i khoáº£n
          </a>
        </div>
      </header>

      <div className="account-filter-row" aria-label="Danh má»¥c quyá»n">
        {Array.from(new Set(visibleCatalogPermissions(data.permissions).map((permission) => permission.category))).map((category, index) => (
          <span className={index === 0 ? "is-selected" : undefined} key={category}>
            {category}
          </span>
        ))}
      </div>

      <div className="group-table-shell" tabIndex={0} aria-label="Báº£ng quyá»n chi tiáº¿t cÃ³ thá»ƒ cuá»™n ngang">
        <table className="detailed-permission-table">
          <thead>
            <tr>
              <th scope="col">Quyá»n</th>
              <th scope="col">Danh má»¥c</th>
              <th scope="col">Admin</th>
              <th scope="col">NhÃ³m dÃ¹ng</th>
              <th scope="col">TÃ i khoáº£n hiá»‡u lá»±c</th>
              <th scope="col">Quyá»n riÃªng</th>
            </tr>
          </thead>
          <tbody>
            {visibleCatalogPermissions(data.permissions).map((permission) => {
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
                        <Check size={14} weight="duotone" aria-label="Quyá»n quáº£n trá»‹" />
                      ) : (
                        <Lock size={14} weight="duotone" aria-label="KhÃ´ng yÃªu cáº§u admin" />
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
                        <Lock size={14} weight="duotone" aria-label="KhÃ´ng cÃ³ quyá»n riÃªng" />
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
          <h2 id="permission-category-title">Danh má»¥c</h2>
          <p>{categories.length} nhÃ³m quyá»n nghiá»‡p vá»¥</p>
        </div>
      </header>

      <div className="toolbar-permission-list">
        {categories.map((category) => (
          <article key={category}>
            <span>{category}</span>
            <strong>{permissions.filter((permission) => permission.category === category).length} quyá»n</strong>
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
          <h2 id="group-usage-title">NhÃ³m Ä‘ang dÃ¹ng</h2>
          <p>{selectedPermission?.label ?? "ChÆ°a cÃ³ quyá»n"}</p>
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
              <p>{roleLabels[group.role]} Â· {group.memberCount} ngÆ°á»i</p>
              <strong>{group.permissionKeys.length} quyá»n cáº¥u hÃ¬nh</strong>
            </div>
          </article>
        ))}
        {groups.length === 0 ? (
          <article>
            <span>
              <Lock size={16} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>ChÆ°a cÃ³ nhÃ³m</h3>
              <p>Quyá»n nÃ y chÆ°a Ä‘Æ°á»£c gÃ¡n vÃ o nhÃ³m active nÃ o.</p>
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
          <h2 id="effective-account-title">TÃ i khoáº£n hiá»‡u lá»±c</h2>
          <p>{accounts.length} tÃ i khoáº£n active cÃ³ quyá»n nÃ y</p>
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
              <p>{account.title} Â· {account.email}</p>
            </div>
          </article>
        ))}
        {accounts.length > visibleAccounts.length ? (
          <p className="account-empty-state">+{accounts.length - visibleAccounts.length} tÃ i khoáº£n khÃ¡c.</p>
        ) : null}
        {accounts.length === 0 ? <p className="account-empty-state">ChÆ°a cÃ³ tÃ i khoáº£n hiá»‡u lá»±c.</p> : null}
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
          <h2 id="custom-override-title">Quyá»n riÃªng</h2>
          <p>{customAccounts.length} tÃ i khoáº£n cÃ³ override</p>
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
              <p>{account.customPermissionKeys.length} quyá»n riÃªng</p>
              <strong>{account.customPermissionNote ?? "KhÃ´ng cÃ³ ghi chÃº."}</strong>
            </div>
          </article>
        ))}
        {customAccounts.length === 0 ? (
          <article>
            <span>
              <Lock size={16} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>KhÃ´ng cÃ³ override</h3>
              <p>Táº¥t cáº£ tÃ i khoáº£n Ä‘ang dÃ¹ng quyá»n theo nhÃ³m.</p>
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
    <section className="group-example-panel detailed-permission-selected" aria-label="Quyá»n Ä‘ang chá»n">
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
      <strong>ChÆ°a káº¿t ná»‘i Ä‘Æ°á»£c Account API</strong>
      <span>{data.error ?? "HÃ£y báº­t API server rá»“i táº£i láº¡i trang."}</span>
    </section>
  );
}

export function DetailedPermissionSettingsBoard({ data }: { data: AccountAccessData }) {
  const usageMaps = buildPermissionUsageMaps(data);
  const selectedPermission = visibleCatalogPermissions(data.permissions)[0];

  return (
    <main className="account-access-page detailed-permission-page" aria-label="CÃ i Ä‘áº·t quyá»n chi tiáº¿t">
      <ApiStatusBanner data={data} />

      <section className="org-page-heading" aria-labelledby="detailed-permission-page-title">
        <div>
          <span>CÃ i Ä‘áº·t há»‡ thá»‘ng Â· TÃ i khoáº£n ngÆ°á»i dÃ¹ng</span>
          <h1 id="detailed-permission-page-title">Quyá»n chi tiáº¿t</h1>
          <p>Danh má»¥c quyá»n Ä‘ang Ä‘Æ°á»£c láº¥y tá»« PermissionDefinition vÃ  Ä‘á»‘i chiáº¿u vá»›i nhÃ³m quyá»n, tÃ i khoáº£n hiá»‡u lá»±c, quyá»n riÃªng.</p>
        </div>
        <a className="secondary-button" href="/admin/settings/accounts/groups">
          Quay láº¡i nhÃ³m
        </a>
      </section>

      <PermissionSummary data={data} usageMaps={usageMaps} />

      <section className="account-access-layout" aria-label="Thiáº¿t láº­p quyá»n chi tiáº¿t">
        <div className="account-access-main">
          <PermissionCatalogTable data={data} usageMaps={usageMaps} selectedPermission={selectedPermission} />
          <SelectedPermissionPanel permission={selectedPermission} />
        </div>

        <aside className="account-access-side" aria-label="Äá»‘i chiáº¿u quyá»n Ä‘ang chá»n">
          <CategoryPanel permissions={data.permissions} />
          <GroupUsagePanel selectedPermission={selectedPermission} usageMaps={usageMaps} />
          <EffectiveAccountPanel selectedPermission={selectedPermission} usageMaps={usageMaps} />
          <CustomOverridePanel data={data} />
        </aside>
      </section>
    </main>
  );
}
