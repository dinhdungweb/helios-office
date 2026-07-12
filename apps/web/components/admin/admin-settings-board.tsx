"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
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
import type {
  AdminModuleSettingGroup,
  AdminOperationEvent,
  AdminSettingItem,
  AdminSettingsData,
  AdminSettingsPayload,
  AdminSettingStatus
} from "@/lib/admin-settings-api";

type AdminSettingsTab = "system" | "modules" | "operations" | "logs";

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

const statusTones: Record<AdminSettingStatus, BadgeTone> = {
  configured: "success",
  needs_review: "warning",
  planned: "info"
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

type AuditActionMeta = {
  label: string;
  detail: string;
  scope: string;
};

const auditActionLabels: Record<string, AuditActionMeta> = {
  "account.create": {
    label: "Tạo tài khoản",
    detail: "Cấp tài khoản đăng nhập mới.",
    scope: "Tài khoản"
  },
  "account.update": {
    label: "Cập nhật tài khoản",
    detail: "Thay đổi thông tin, nhóm quyền hoặc trạng thái tài khoản.",
    scope: "Tài khoản"
  },
  "account.activate": {
    label: "Kích hoạt tài khoản",
    detail: "Mở quyền đăng nhập cho người dùng.",
    scope: "Tài khoản"
  },
  "account.close": {
    label: "Đóng tài khoản",
    detail: "Ngừng quyền đăng nhập của người dùng.",
    scope: "Tài khoản"
  },
  "account.invite.resent": {
    label: "Gửi lại invite",
    detail: "Gửi lại email mời hoặc yêu cầu đổi mật khẩu.",
    scope: "Tài khoản"
  },
  "account.invite.sent": {
    label: "Gửi invite thành công",
    detail: "Email invite hoặc reset password đã gửi được.",
    scope: "Tài khoản"
  },
  "account.invite.failed": {
    label: "Gửi invite lỗi",
    detail: "Email invite hoặc reset password chưa gửi được.",
    scope: "Tài khoản"
  },
  "account.invite.deferred": {
    label: "Hoãn gửi invite",
    detail: "Chưa gửi invite vì tài khoản chưa đủ điều kiện.",
    scope: "Tài khoản"
  },
  "account.invite.skipped": {
    label: "Bỏ qua invite",
    detail: "Không gửi invite vì không có yêu cầu hoặc cấu hình gửi email đang tắt.",
    scope: "Tài khoản"
  },
  "permission_group.create": {
    label: "Tạo nhóm quyền",
    detail: "Tạo nhóm người dùng mới.",
    scope: "Nhóm quyền"
  },
  "permission_group.update": {
    label: "Sửa nhóm quyền",
    detail: "Cập nhật vai trò hoặc quyền áp dụng.",
    scope: "Nhóm quyền"
  },
  "permission_group.archive": {
    label: "Lưu trữ nhóm quyền",
    detail: "Ẩn nhóm quyền khỏi danh sách gán mới.",
    scope: "Nhóm quyền"
  },
  "permission_group.restore": {
    label: "Khôi phục nhóm quyền",
    detail: "Kích hoạt lại nhóm quyền đã lưu trữ.",
    scope: "Nhóm quyền"
  },
  "permission_definition.create": {
    label: "Tạo quyền chi tiết",
    detail: "Thêm quyền mới vào catalog phân quyền.",
    scope: "Quyền"
  },
  "permission_definition.update": {
    label: "Sửa quyền chi tiết",
    detail: "Cập nhật tên, danh mục hoặc phạm vi quyền.",
    scope: "Quyền"
  },
  "permission_definition.delete": {
    label: "Xóa quyền chi tiết",
    detail: "Xóa quyền không còn được nhóm hoặc tài khoản sử dụng.",
    scope: "Quyền"
  },
  "admin_setting.company_info.update": {
    label: "Sửa thông tin doanh nghiệp",
    detail: "Cập nhật cấu hình pháp lý hoặc liên hệ.",
    scope: "Cài đặt"
  },
  "admin_setting.intranet.update": {
    label: "Sửa mạng nội bộ",
    detail: "Cập nhật branding, bảng tin hoặc thông báo.",
    scope: "Cài đặt"
  },
  "admin_setting.smtp.update": {
    label: "Sửa SMTP",
    detail: "Cập nhật cấu hình gửi email hệ thống.",
    scope: "SMTP"
  },
  "admin_setting.smtp.test_sent": {
    label: "Gửi thử SMTP thành công",
    detail: "Email kiểm thử đã gửi được.",
    scope: "SMTP"
  },
  "admin_setting.smtp.test_failed": {
    label: "Gửi thử SMTP lỗi",
    detail: "Email kiểm thử chưa gửi được.",
    scope: "SMTP"
  },
  "admin_setting.smtp.secret_migrated": {
    label: "Mã hóa SMTP secret",
    detail: "Di chuyển password SMTP sang dạng mã hóa.",
    scope: "SMTP"
  },
  "admin_setting.module_config.update": {
    label: "Cập nhật phân hệ",
    detail: "Thay đổi cấu hình phân hệ nội bộ.",
    scope: "Cài đặt"
  },
  "device_auth.policy.update": {
    label: "Sửa chính sách thiết bị",
    detail: "Cập nhật quy tắc xác thực thiết bị.",
    scope: "Thiết bị"
  },
  "device_auth.policy_update": {
    label: "Sửa chính sách thiết bị",
    detail: "Cập nhật quy tắc xác thực thiết bị.",
    scope: "Thiết bị"
  },
  "device_auth.request.update": {
    label: "Cập nhật thiết bị",
    detail: "Duyệt, từ chối hoặc khóa thiết bị.",
    scope: "Thiết bị"
  },
  "device_auth.status_update": {
    label: "Cập nhật trạng thái thiết bị",
    detail: "Duyệt, từ chối hoặc khóa thiết bị chấm công.",
    scope: "Thiết bị"
  },
  "device_auth.delete": {
    label: "Xóa yêu cầu thiết bị",
    detail: "Xóa yêu cầu xác thực thiết bị khỏi danh sách.",
    scope: "Thiết bị"
  },
  "job_position.create": {
    label: "Tạo vị trí",
    detail: "Thêm danh mục vị trí chuyên môn cho hồ sơ nhân sự.",
    scope: "Nhân sự"
  },
  "job_position.update": {
    label: "Sửa vị trí",
    detail: "Cập nhật mã, tên hoặc nhóm chuyên môn của vị trí.",
    scope: "Nhân sự"
  },
  "job_position.archive": {
    label: "Lưu trữ vị trí",
    detail: "Ẩn vị trí khỏi danh sách gán mới.",
    scope: "Nhân sự"
  },
  "job_position.restore": {
    label: "Khôi phục vị trí",
    detail: "Đưa vị trí đã lưu trữ trở lại hoạt động.",
    scope: "Nhân sự"
  },
  "job_title.create": {
    label: "Tạo chức danh",
    detail: "Thêm danh mục chức danh hoặc cấp bậc cho hồ sơ nhân sự.",
    scope: "Nhân sự"
  },
  "job_title.update": {
    label: "Sửa chức danh",
    detail: "Cập nhật mã, tên hoặc thứ bậc chức danh.",
    scope: "Nhân sự"
  },
  "job_title.archive": {
    label: "Lưu trữ chức danh",
    detail: "Ẩn chức danh khỏi danh sách gán mới.",
    scope: "Nhân sự"
  },
  "job_title.restore": {
    label: "Khôi phục chức danh",
    detail: "Đưa chức danh đã lưu trữ trở lại hoạt động.",
    scope: "Nhân sự"
  },
  "employee.create": {
    label: "Tạo hồ sơ nhân sự",
    detail: "Thêm hồ sơ nhân sự mới.",
    scope: "Nhân sự"
  },
  "department.create": {
    label: "Tạo phòng ban",
    detail: "Thêm phòng ban mới vào sơ đồ tổ chức.",
    scope: "Sơ đồ tổ chức"
  },
  "department.update": {
    label: "Sửa phòng ban",
    detail: "Cập nhật tên, cấp cha hoặc trưởng phòng.",
    scope: "Sơ đồ tổ chức"
  },
  "department.archive": {
    label: "Lưu trữ phòng ban",
    detail: "Ẩn phòng ban khỏi danh sách gán mới.",
    scope: "Sơ đồ tổ chức"
  },
  "department.restore": {
    label: "Khôi phục phòng ban",
    detail: "Đưa phòng ban đã lưu trữ trở lại hoạt động.",
    scope: "Sơ đồ tổ chức"
  }
};

const auditSeverityLabels: Record<AdminOperationEvent["severity"], string> = {
  info: "Thông tin",
  warning: "Cần chú ý",
  critical: "Quan trọng"
};

function resolveAuditAction(event: AdminOperationEvent): AuditActionMeta {
  return (
    auditActionLabels[event.action] ?? {
      label: event.action,
      detail: "Thao tác hệ thống chưa được đặt nhãn.",
      scope: event.target.split(" ")[0] || "Hệ thống"
    }
  );
}

function formatAuditActor(actor: string) {
  return actor === "System" ? "Hệ thống" : actor;
}

function formatAuditTarget(target: string) {
  const fallbackLabels: Record<string, string> = {
    AdminSetting: "Cài đặt hệ thống chưa xác định",
    DeviceAuthPolicy: "Chính sách xác thực thiết bị",
    DeviceAuthRequest: "Thiết bị chưa xác định",
    Department: "Phòng ban chưa xác định",
    Employee: "Nhân sự chưa xác định",
    JobPosition: "Vị trí chưa xác định",
    JobTitle: "Chức danh chưa xác định",
    PermissionDefinition: "Quyền chưa xác định",
    PermissionGroup: "Nhóm quyền chưa xác định",
    UserAccount: "Tài khoản chưa xác định"
  };
  const [entityType] = target.split(" ");

  return fallbackLabels[entityType] ?? target;
}

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

const fallbackData: AdminSettingsPayload = {
  overview: {
    totalSettings: 0,
    configured: 0,
    needsReview: 0,
    planned: 0,
    systemSettings: 0,
    moduleSettings: 0,
    operationSettings: 0,
    activeUsers: 0
  },
  system: [],
  modules: [],
  operations: [],
  events: []
};

const hashToTab: Record<string, AdminSettingsTab> = {
  "#system-settings": "system",
  "#module-settings": "modules",
  "#operations": "operations",
  "#reconciliation": "operations",
  "#audit-logs": "logs"
};

const tabToHash: Record<AdminSettingsTab, string> = {
  system: "#system-settings",
  modules: "#module-settings",
  operations: "#operations",
  logs: "#audit-logs"
};

function resolveTabFromHash(hash: string): AdminSettingsTab {
  return hashToTab[hash] ?? "system";
}

function SettingStatusBadge({ status }: { status: AdminSettingStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <Badge
      className={`admin-setting-status admin-setting-status--${status}`}
      icon={<StatusIcon size={14} weight="duotone" aria-hidden="true" />}
      tone={statusTones[status]}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function SettingCard({ item, icon: SettingIcon }: { item: AdminSettingItem; icon: Icon }) {
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

function SummaryGrid({ data }: { data: AdminSettingsPayload }) {
  const summaryItems = [
    { label: "System Settings", value: data.overview.systemSettings, icon: GearSix },
    { label: "Module Settings", value: data.overview.moduleSettings, icon: SlidersHorizontal },
    { label: "Vận hành", value: data.overview.operationSettings, icon: FileClock },
    { label: "User hoạt động", value: data.overview.activeUsers, icon: Users }
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
          <strong>{data.overview.configured}/{data.overview.totalSettings}</strong>
          <p>Cấu hình đã hoàn tất</p>
        </div>
      </article>
    </section>
  );
}

function SystemSettingsPanel({ settings }: { settings: AdminSettingItem[] }) {
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
          const groupItems = settings.filter((item) => item.category === group.category);
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

function ModuleSettingsPanel({ groups }: { groups: AdminModuleSettingGroup[] }) {
  return (
    <section className="admin-setting-panel" id="module-settings" aria-labelledby="module-settings-title">
      <header className="admin-setting-panel-header">
        <div>
          <span>Module Settings</span>
          <h2 id="module-settings-title">Cài đặt nghiệp vụ theo phân hệ</h2>
        </div>
      </header>

      <div className="admin-module-grid">
        {groups.map((group) => {
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

function OperationPanel({ operations }: { operations: AdminSettingItem[] }) {
  return (
    <section className="admin-setting-panel" id="operations" aria-labelledby="operations-title">
      <header className="admin-setting-panel-header">
        <div>
          <span>Operations</span>
          <h2 id="operations-title">Quản trị dữ liệu và vận hành</h2>
        </div>
      </header>

      <div className="admin-setting-card-grid admin-setting-card-grid--operations">
        {operations.map((item) => (
          <SettingCard item={item} icon={operationIcons[item.id] ?? GearSix} key={item.id} />
        ))}
      </div>
    </section>
  );
}

function AuditLogPanel({ events }: { events: AdminOperationEvent[] }) {
  const pageSize = 20;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(events.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const visibleEvents = events.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [events.length]);

  return (
    <section className="admin-setting-panel" id="audit-logs" aria-labelledby="audit-logs-title">
      <header className="admin-setting-panel-header">
        <div>
          <span>Audit Logs</span>
          <h2 id="audit-logs-title">Lịch sử thao tác gần đây</h2>
        </div>
        <a className="secondary-button" href="/admin/settings/accounts">
          Đối soát tài khoản
        </a>
      </header>

      <div className="admin-audit-log-shell">
        <div className="admin-audit-table-shell" tabIndex={0} aria-label="Bảng nhật ký thao tác hệ thống">
            <table className="admin-audit-table">
              <thead>
                <tr>
                  <th scope="col">Thời gian</th>
                  <th scope="col">Tên log</th>
                  <th scope="col">Phạm vi</th>
                  <th scope="col">Người thao tác</th>
                  <th scope="col">Đối tượng</th>
                  <th scope="col">Mức</th>
                </tr>
              </thead>
              <tbody>
                {visibleEvents.map((event) => {
                  const actionMeta = resolveAuditAction(event);

                  return (
                    <tr key={event.id}>
                      <td>
                        <time>{event.time}</time>
                      </td>
                      <th scope="row">
                        <strong>{actionMeta.label}</strong>
                        <small>{actionMeta.detail}</small>
                      </th>
                      <td>{actionMeta.scope}</td>
                      <td>{formatAuditActor(event.actor)}</td>
                      <td>
                        <span>{formatAuditTarget(event.target)}</span>
                      </td>
                      <td>
                        <Badge
                          className={`admin-audit-severity admin-audit-severity--${event.severity}`}
                          tone={event.severity === "critical" ? "danger" : event.severity === "warning" ? "warning" : "info"}
                        >
                          {auditSeverityLabels[event.severity]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pageCount > 1 ? (
            <footer className="admin-audit-pagination">
              <span>
                {pageStart + 1}-{Math.min(pageStart + visibleEvents.length, events.length)} / {events.length}
              </span>
              <div>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={safePage === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Trước
                </button>
                <strong>{safePage}/{pageCount}</strong>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={safePage === pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                >
                  Sau
                </button>
              </div>
            </footer>
          ) : null}
      </div>
    </section>
  );
}

export function AdminSettingsBoard({ data }: { data: AdminSettingsData }) {
  const [activeTab, setActiveTab] = useState<AdminSettingsTab>("system");
  const settingsData = data.data ?? fallbackData;

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
      {data.source === "unavailable" ? (
        <section className="account-api-banner" role="status">
          <strong>Chưa kết nối được Admin Settings API</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      <SummaryGrid data={settingsData} />
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
          <Tabs.Trigger value="logs">
            <ClipboardText size={17} weight="duotone" aria-hidden="true" />
            Nhật ký
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content className="admin-settings-tab-panel" value="system">
          <SystemSettingsPanel settings={settingsData.system} />
        </Tabs.Content>
        <Tabs.Content className="admin-settings-tab-panel" value="modules">
          <ModuleSettingsPanel groups={settingsData.modules} />
        </Tabs.Content>
        <Tabs.Content className="admin-settings-tab-panel" value="operations">
          <OperationPanel operations={settingsData.operations} />
        </Tabs.Content>
        <Tabs.Content className="admin-settings-tab-panel" value="logs">
          <AuditLogPanel events={settingsData.events} />
        </Tabs.Content>
      </Tabs.Root>
    </main>
  );
}
