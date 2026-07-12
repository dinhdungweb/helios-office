import {
  ArrowSquareOut,
  Bell,
  CalendarCheck,
  CheckCircle,
  ClipboardText,
  Clock,
  GearSix,
  Key,
  Lock,
  Megaphone,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  WarningCircle
} from "@/lib/icons";
import type { AdminDashboardData } from "@/lib/admin-dashboard-api";

type AdminDashboardBoardProps = {
  data: AdminDashboardData;
};

const alertToneClass = {
  info: "admin-dashboard-alert--info",
  warning: "admin-dashboard-alert--warning",
  critical: "admin-dashboard-alert--critical"
} as const;

function MetricCard({
  detail,
  href,
  icon: Icon,
  label,
  value
}: {
  detail: string;
  href?: string;
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  const content = (
    <>
      <span>
        <Icon size={19} weight="duotone" aria-hidden="true" />
      </span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        <small>{detail}</small>
      </div>
    </>
  );

  return href ? (
    <a className="admin-dashboard-metric" href={href}>
      {content}
    </a>
  ) : (
    <article className="admin-dashboard-metric">{content}</article>
  );
}

function ProgressRow({ label, tone = "info", value }: { label: string; tone?: "info" | "success" | "warning"; value: number }) {
  return (
    <div className="admin-dashboard-progress">
      <header>
        <span>{label}</span>
        <strong>{value}%</strong>
      </header>
      <div>
        <span className={`admin-dashboard-progress-fill admin-dashboard-progress-fill--${tone}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function SystemOverview({ data }: { data: AdminDashboardData }) {
  return (
    <section className="admin-dashboard-panel admin-dashboard-system" aria-labelledby="admin-system-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>System overview</p>
          <h2 id="admin-system-title">Sức khỏe hệ thống</h2>
        </div>
        <a className="secondary-button" href="/admin/settings">
          <GearSix size={16} weight="duotone" aria-hidden="true" />
          Cài đặt
        </a>
      </header>
      <div className="admin-dashboard-system-grid">
        <MetricCard
          detail={`${data.system.activeEmployees} đang hoạt động`}
          href="/admin/hr/employees"
          icon={Users}
          label="Tổng nhân sự"
          value={data.system.totalEmployees}
        />
        <MetricCard
          detail={`${data.system.activeAccounts}/${data.system.totalAccounts} tài khoản active`}
          href="/admin/settings/accounts"
          icon={Key}
          label="Tài khoản sử dụng"
          value={`${data.system.accountUsagePercent}%`}
        />
        <MetricCard
          detail={`${data.system.storageUsedGb}/${data.system.storageLimitGb} GB`}
          icon={Lock}
          label="Dung lượng"
          value={`${data.system.storageUsagePercent}%`}
        />
        <MetricCard
          detail={`Hết hạn: ${data.system.expiryDate}`}
          icon={Clock}
          label="Thời hạn hệ thống"
          value={`${data.system.remainingDays} ngày`}
        />
      </div>
      <div className="admin-dashboard-system-bars">
        <ProgressRow label="Tài khoản hoạt động" tone="success" value={data.system.accountUsagePercent} />
        <ProgressRow label="Dung lượng đã dùng" tone={data.system.storageUsagePercent > 80 ? "warning" : "info"} value={data.system.storageUsagePercent} />
      </div>
    </section>
  );
}

function ApprovalCenter({ data }: { data: AdminDashboardData }) {
  return (
    <section className="admin-dashboard-panel" aria-labelledby="admin-approval-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>Approval center</p>
          <h2 id="admin-approval-title">Phê duyệt & cảnh báo</h2>
        </div>
        <a className="secondary-button" href="/admin/approvals-alerts">
          <ClipboardText size={16} weight="duotone" aria-hidden="true" />
          Xem tất cả
        </a>
      </header>

      <div className="admin-dashboard-alert-grid">
        <article>
          <strong>{data.approvals.pendingRequests}</strong>
          <span>Đơn từ chờ duyệt</span>
        </article>
        <article>
          <strong>{data.approvals.overdueTasks}</strong>
          <span>Mục cần rà soát</span>
        </article>
        <article>
          <strong>{data.approvals.securityAlerts}</strong>
          <span>Cảnh báo bảo mật</span>
        </article>
      </div>

      <div className="admin-dashboard-alert-list">
        {data.approvals.items.length > 0 ? (
          data.approvals.items.map((item) => (
            <a className={`admin-dashboard-alert ${alertToneClass[item.tone]}`} href={item.href} key={item.id}>
              <WarningCircle size={18} weight="duotone" aria-hidden="true" />
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <ArrowSquareOut size={15} weight="duotone" aria-hidden="true" />
            </a>
          ))
        ) : (
          <div className="admin-dashboard-empty">
            <CheckCircle size={22} weight="duotone" aria-hidden="true" />
            Không có cảnh báo đang tồn đọng.
          </div>
        )}
      </div>
    </section>
  );
}

function HrmAnalytics({ data }: { data: AdminDashboardData }) {
  const maxMovement = Math.max(1, ...data.hrm.monthlyMovement.flatMap((item) => [item.joined, item.resigned]));

  return (
    <section className="admin-dashboard-panel admin-dashboard-hrm" aria-labelledby="admin-hrm-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>HRM analytics</p>
          <h2 id="admin-hrm-title">Thống kê nhân sự</h2>
        </div>
        <a className="secondary-button" href="/admin/settings/org-chart">
          <Users size={16} weight="duotone" aria-hidden="true" />
          Cơ cấu
        </a>
      </header>

      <div className="admin-dashboard-hrm-grid">
        <article>
          <span>Vào mới tháng này</span>
          <strong>{data.hrm.newEmployeesThisMonth}</strong>
        </article>
        <article>
          <span>Nghỉ việc tháng này</span>
          <strong>{data.hrm.resignedThisMonth}</strong>
        </article>
        <article>
          <span>Tỷ lệ công hợp lệ</span>
          <strong>{data.hrm.attendanceRate}%</strong>
        </article>
      </div>

      <div className="admin-dashboard-movement" aria-label="Biến động nhân sự 6 tháng">
        {data.hrm.monthlyMovement.map((item) => (
          <div key={item.month}>
            <span className="admin-dashboard-bars">
              <i style={{ height: `${Math.max(8, (item.joined / maxMovement) * 64)}px` }} />
              <b style={{ height: `${Math.max(8, (item.resigned / maxMovement) * 64)}px` }} />
            </span>
            <small>{item.month}</small>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-departments">
        {data.hrm.departments.map((department) => (
          <ProgressRow key={department.id} label={`${department.name} · ${department.headcount} người`} tone="success" value={department.percent} />
        ))}
      </div>
    </section>
  );
}

function InternalCommunication({ data }: { data: AdminDashboardData }) {
  return (
    <section className="admin-dashboard-panel" aria-labelledby="admin-internal-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>Internal communication</p>
          <h2 id="admin-internal-title">Mạng nội bộ</h2>
        </div>
        <a className="secondary-button" href="/social">
          <Megaphone size={16} weight="duotone" aria-hidden="true" />
          Bảng tin
        </a>
      </header>

      <div className="admin-dashboard-read-rate">
        <strong>{data.internal.averageReadRate}%</strong>
        <span>tỷ lệ đọc thông báo trung bình</span>
      </div>

      <div className="admin-dashboard-news-list">
        {data.internal.announcements.map((announcement) => (
          <article key={announcement.id}>
            <strong>{announcement.title}</strong>
            <small>{announcement.time} · {announcement.audience}</small>
          </article>
        ))}
      </div>

      <div className="admin-dashboard-birthday-list" aria-label="Sự kiện sắp tới">
        {data.internal.birthdays.map((birthday) => (
          <article key={`${birthday.name}-${birthday.date}`}>
            <span>{birthday.initials}</span>
            <strong>{birthday.name}</strong>
            <small>{birthday.date}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuickAccess() {
  const links = [
    { label: "Thêm nhân sự", href: "/admin/hr/employees/new", icon: Users },
    { label: "Phân quyền", href: "/admin/settings/accounts/groups", icon: ShieldCheck },
    { label: "Xác thực thiết bị", href: "/admin/settings/accounts/device-auth", icon: Bell },
    { label: "Cấu hình hệ thống", href: "/admin/settings", icon: SlidersHorizontal }
  ];

  return (
    <section className="admin-dashboard-panel" aria-labelledby="admin-quick-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>Quick access</p>
          <h2 id="admin-quick-title">Lối tắt tiện ích</h2>
        </div>
      </header>
      <div className="admin-dashboard-shortcuts">
        {links.map((link) => (
          <a href={link.href} key={link.href}>
            <link.icon size={18} weight="duotone" aria-hidden="true" />
            <span>{link.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function OperationsLog({ data }: { data: AdminDashboardData }) {
  return (
    <section className="admin-dashboard-panel" aria-labelledby="admin-operations-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>Operations</p>
          <h2 id="admin-operations-title">Vận hành gần đây</h2>
        </div>
        <a className="secondary-button" href="/admin/settings#audit-logs">
          <ClipboardText size={16} weight="duotone" aria-hidden="true" />
          Log
        </a>
      </header>
      <div className="admin-dashboard-operation-summary">
        <span>{data.operations.settingsConfigured} đã cấu hình</span>
        <span>{data.operations.settingsNeedReview} cần rà soát</span>
        <span>{data.operations.settingsPlanned} sắp triển khai</span>
      </div>
      <div className="admin-dashboard-operation-list">
        {data.operations.events.map((event) => (
          <article key={event.id}>
            <span className={`admin-dashboard-event-dot admin-dashboard-event-dot--${event.severity}`} />
            <div>
              <strong>{event.action}</strong>
              <small>{event.actor} · {event.target}</small>
            </div>
            <time>{event.time}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AdminDashboardBoard({ data }: AdminDashboardBoardProps) {
  return (
    <main className="admin-dashboard-page" aria-label="Dashboard tài khoản Admin">
      <section className="admin-dashboard-heading" aria-labelledby="admin-dashboard-title">
        <div>
          <p>Admin command center</p>
          <h1 id="admin-dashboard-title">Trung tâm điều hành</h1>
          <span>Cập nhật {data.generatedAt}</span>
        </div>
        <div className="admin-dashboard-heading-actions">
          <a className="secondary-button" href="/admin/settings/accounts">
            <Key size={16} weight="duotone" aria-hidden="true" />
            Tài khoản
          </a>
          <a className="primary-button" href="/admin/hr/employees/new">
            <Users size={16} weight="duotone" aria-hidden="true" />
            Thêm nhân sự
          </a>
        </div>
      </section>

      {data.source !== "api" ? (
        <section className="account-api-banner" role="status">
          <strong>Một phần dữ liệu chưa sẵn sàng</strong>
          <span>{data.errors.slice(0, 2).join(" · ") || "Dashboard đang dùng một phần dữ liệu dự phòng."}</span>
        </section>
      ) : null}

      <SystemOverview data={data} />

      <section className="admin-dashboard-layout">
        <div className="admin-dashboard-main">
          <ApprovalCenter data={data} />
          <HrmAnalytics data={data} />
          <OperationsLog data={data} />
        </div>
        <aside className="admin-dashboard-side">
          <InternalCommunication data={data} />
          <QuickAccess />
        </aside>
      </section>
    </main>
  );
}
