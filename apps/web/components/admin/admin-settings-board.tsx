"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import {
  ArrowSquareOut,
  Bank,
  CheckCircle,
  ClipboardText,
  Clock,
  EnvelopeSimple,
  FileClock,
  GearSix,
  Key,
  Lock,
  Megaphone,
  Network,
  Package,
  ShieldCheck,
  SlidersHorizontal,
  SquaresFour,
  Users,
  WarningCircle
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import {
  adminOperationEvents,
  managedUserAccounts,
  moduleSettingGroups,
  operationSettingItems,
  systemSettingItems,
  type AdminSettingItem,
  type AdminSettingStatus
} from "@/lib/mock-data";

type AdminSettingsTab = "system" | "modules" | "operations";

const statusLabels: Record<AdminSettingStatus, string> = {
  configured: "Đã cấu hình",
  needs_review: "Cần rà soát",
  planned: "Sắp triển khai"
};

const statusIcons: Record<AdminSettingStatus, Icon> = {
  configured: CheckCircle,
  needs_review: WarningCircle,
  planned: Clock
};

const systemIcons: Record<string, Icon> = {
  "org-chart": Network,
  positions: ClipboardText,
  "user-accounts": Users,
  "device-auth": ShieldCheck,
  "permission-groups": Users,
  "detailed-permissions": ShieldCheck,
  "intranet-branding": Megaphone,
  "security-policy": Lock,
  "company-info": Bank,
  "currency-region": GearSix,
  smtp: EnvelopeSimple,
  "message-templates": ClipboardText,
  "system-open-api": Key,
  "system-audit-log": FileClock,
  "system-reconciliation": Bank
};

const operationIcons: Record<string, Icon> = {
  reconciliation: Bank,
  "audit-log": FileClock,
  "import-export": ClipboardText,
  "open-api": Key
};

const moduleIcons: Record<string, Icon> = {
  hrm: Users,
  work: ClipboardText,
  crm: Package
};

const systemSettingGroups = [
  {
    category: "Quản trị Tổ chức & Nhân sự",
    summary: "Bộ khung nhân sự, tài khoản đăng nhập và thiết bị chấm công."
  },
  {
    category: "Phân quyền",
    summary: "Nhóm quyền và quyền chi tiết theo nhóm hoặc cá nhân."
  },
  {
    category: "Cấu hình Hệ thống chung",
    summary: "Giao diện, bảo mật, thông tin doanh nghiệp, tiền tệ và khu vực."
  },
  {
    category: "Kết nối & Giao tiếp",
    summary: "SMTP, mẫu tin tự động và Open API cho tích hợp bên thứ ba."
  },
  {
    category: "Giám sát & Đối soát",
    summary: "Log hệ thống, dung lượng, tài khoản hoạt động và hóa đơn dịch vụ."
  }
];

const hashToTab: Record<string, AdminSettingsTab> = {
  "#system-settings": "system",
  "#module-settings": "modules",
  "#operations": "operations",
  "#reconciliation": "operations"
};

const tabToHash: Record<AdminSettingsTab, string> = {
  system: "#system-settings",
  modules: "#module-settings",
  operations: "#operations"
};

function resolveTabFromHash(hash: string): AdminSettingsTab {
  return hashToTab[hash] ?? "system";
}

function SettingStatusBadge({ status }: { status: AdminSettingStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <span className={`admin-setting-status admin-setting-status--${status}`}>
      <StatusIcon size={14} weight="duotone" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function SettingCard({
  item,
  icon: SettingIcon
}: {
  item: AdminSettingItem;
  icon: Icon;
}) {
  const body = (
    <>
      <span className="admin-setting-icon">
        <SettingIcon size={19} weight="duotone" aria-hidden="true" />
      </span>
      <div className="admin-setting-card-body">
        <header>
          <h3>{item.title}</h3>
          <SettingStatusBadge status={item.status} />
        </header>
        <div className="admin-setting-card-main">
          <p>{item.summary}</p>
        </div>
        <footer className="admin-setting-card-meta">
          <span>{item.owner}</span>
          <span>{item.controls.length} cấu hình</span>
        </footer>
      </div>
      <ArrowSquareOut size={16} weight="duotone" aria-hidden="true" />
    </>
  );

  return item.href ? (
    <a className="admin-setting-card" href={item.href}>
      {body}
    </a>
  ) : (
    <button className="admin-setting-card" type="button">
      {body}
    </button>
  );
}

function SummaryGrid() {
  const allSettings = [
    ...systemSettingItems,
    ...moduleSettingGroups.flatMap((group) => group.settings),
    ...operationSettingItems
  ];
  const activeUsers = managedUserAccounts.filter((account) => account.status === "active").length;
  const summaryItems = [
    { label: "System Settings", value: systemSettingItems.length, icon: GearSix },
    { label: "Module Settings", value: moduleSettingGroups.reduce((total, group) => total + group.settings.length, 0), icon: SlidersHorizontal },
    { label: "Vận hành", value: operationSettingItems.length, icon: FileClock },
    { label: "User hoạt động", value: activeUsers, icon: Users }
  ];

  return (
    <section className="admin-setting-summary-grid" aria-label="Tổng quan admin">
      {summaryItems.map((item) => (
        <article className="admin-setting-summary-card" key={item.label}>
          <span>
            <item.icon size={20} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <strong>{item.value}</strong>
            <p>{item.label}</p>
          </div>
        </article>
      ))}
      <article className="admin-setting-summary-card admin-setting-summary-card--wide">
        <span>
          <CheckCircle size={20} weight="duotone" aria-hidden="true" />
        </span>
        <div>
          <strong>{allSettings.filter((item) => item.status === "configured").length}/{allSettings.length}</strong>
          <p>Cấu hình đã hoàn tất</p>
        </div>
      </article>
    </section>
  );
}

function SystemSettingsPanel() {
  return (
    <section className="admin-setting-panel" id="system-settings" aria-labelledby="system-settings-title">
      <header className="admin-setting-panel-header">
        <div>
          <span>System Settings</span>
          <h2 id="system-settings-title">Trung tâm cài đặt hệ thống</h2>
        </div>
        <a className="secondary-button" href="/admin/settings/accounts">
          <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
          Tài khoản & quyền
        </a>
      </header>

      <div className="admin-system-setting-groups">
        {systemSettingGroups.map((group, index) => {
          const groupItems = systemSettingItems.filter((item) => item.category === group.category);
          const headingId = `system-setting-group-${index}`;

          return (
            <section className="admin-system-setting-group" aria-labelledby={headingId} key={group.category}>
              <header>
                <div>
                  <h3 id={headingId}>{group.category}</h3>
                  <p>{group.summary}</p>
                </div>
                <span>{groupItems.length} mục</span>
              </header>
              <div className="admin-setting-card-grid admin-setting-card-grid--system-group">
                {groupItems.map((item) => (
                  <SettingCard item={item} icon={systemIcons[item.id] ?? GearSix} key={item.id} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function ModuleSettingsPanel() {
  return (
    <section className="admin-setting-panel" id="module-settings" aria-labelledby="module-settings-title">
      <header className="admin-setting-panel-header">
        <div>
          <span>Module Settings</span>
          <h2 id="module-settings-title">Cài đặt nghiệp vụ theo phân hệ</h2>
        </div>
      </header>

      <div className="admin-module-grid">
        {moduleSettingGroups.map((group) => {
          const ModuleIcon = moduleIcons[group.id] ?? SlidersHorizontal;

          return (
            <section className="admin-module-card" key={group.id}>
              <header>
                <div>
                  <h3>{group.module}</h3>
                  <p>{group.summary}</p>
                </div>
                <span>{group.settings.length} mục</span>
              </header>

              <div className="admin-setting-card-grid admin-setting-card-grid--system-group">
                {group.settings.map((setting) => (
                  <SettingCard item={setting} icon={ModuleIcon} key={setting.id} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function OperationPanel() {
  return (
    <section className="admin-setting-panel" id="operations" aria-labelledby="operations-title">
      <header className="admin-setting-panel-header">
        <div>
          <span>Operations</span>
          <h2 id="operations-title">Quản trị dữ liệu và vận hành</h2>
        </div>
      </header>

      <div className="admin-operations-layout">
        <div className="admin-setting-card-grid admin-setting-card-grid--operations">
          {operationSettingItems.map((item) => (
            <SettingCard item={item} icon={operationIcons[item.id] ?? GearSix} key={item.id} />
          ))}
        </div>

        <aside className="admin-operation-log" id="reconciliation" aria-labelledby="operation-log-title">
          <header>
            <h3 id="operation-log-title">Lịch sử gần đây</h3>
            <a href="/admin/settings/accounts">Đối soát license</a>
          </header>
          <div className="admin-operation-event-list">
            {adminOperationEvents.map((event) => (
              <article className={`admin-operation-event admin-operation-event--${event.severity}`} key={event.id}>
                <span aria-hidden="true" />
                <div>
                  <time>{event.time}</time>
                  <h4>{event.action}</h4>
                  <p>{event.actor} · {event.target}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function AdminSettingsBoard() {
  const [activeTab, setActiveTab] = useState<AdminSettingsTab>("system");

  useEffect(() => {
    const syncTabWithHash = () => {
      setActiveTab(resolveTabFromHash(window.location.hash));
    };

    syncTabWithHash();
    window.addEventListener("hashchange", syncTabWithHash);

    return () => {
      window.removeEventListener("hashchange", syncTabWithHash);
    };
  }, []);

  const handleTabChange = (value: string) => {
    const nextTab = value as AdminSettingsTab;
    setActiveTab(nextTab);
    window.history.replaceState(null, "", `${window.location.pathname}${tabToHash[nextTab]}`);
  };

  return (
    <main className="admin-settings-page" aria-label="Trung tâm quản trị">
      <SummaryGrid />
      <Tabs.Root className="admin-settings-tabs" value={activeTab} onValueChange={handleTabChange}>
        <Tabs.List className="admin-settings-tab-list" aria-label="Nhóm cài đặt quản trị">
          <Tabs.Trigger value="system">
            <GearSix size={17} weight="duotone" aria-hidden="true" />
            Hệ thống
          </Tabs.Trigger>
          <Tabs.Trigger value="modules">
            <SquaresFour size={17} weight="duotone" aria-hidden="true" />
            Phân hệ
          </Tabs.Trigger>
          <Tabs.Trigger value="operations">
            <FileClock size={17} weight="duotone" aria-hidden="true" />
            Vận hành
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content className="admin-settings-tab-panel" value="system">
          <SystemSettingsPanel />
        </Tabs.Content>
        <Tabs.Content className="admin-settings-tab-panel" value="modules">
          <ModuleSettingsPanel />
        </Tabs.Content>
        <Tabs.Content className="admin-settings-tab-panel" value="operations">
          <OperationPanel />
        </Tabs.Content>
      </Tabs.Root>
    </main>
  );
}
