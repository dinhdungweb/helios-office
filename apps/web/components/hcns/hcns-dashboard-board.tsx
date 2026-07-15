import { Badge } from "@/components/ui/badge";
import {
  ArrowSquareOut,
  Briefcase,
  Cake,
  CalendarCheck,
  ChartLineUp,
  CheckCircle,
  ClipboardText,
  FileClock,
  FunnelSimple,
  Money,
  Target,
  Umbrella,
  Users,
  WarningCircle
} from "@/lib/icons";
import type { HcnsDashboardData, HcnsDashboardWidgetKey } from "@/lib/hcns-dashboard-api";

type HcnsDashboardBoardProps = {
  data: HcnsDashboardData;
};

const attendanceStatusLabel: Record<string, string> = {
  early_leave: "Về sớm",
  late: "Đi muộn",
  missing_checkout: "Thiếu checkout",
  needs_review: "Cần rà soát",
  valid: "Hợp lệ"
};

const moduleStatusTone = {
  configured: "success",
  planned: "info",
  review: "warning"
} as const;

const moduleStatusLabel = {
  configured: "Đã cấu hình",
  planned: "Sắp triển khai",
  review: "Cần rà soát"
} as const;

function hasWidget(data: HcnsDashboardData, widget: HcnsDashboardWidgetKey) {
  return data.visibleWidgets.includes(widget);
}

function hasAnyWidget(data: HcnsDashboardData, widgets: HcnsDashboardWidgetKey[]) {
  return widgets.some((widget) => hasWidget(data, widget));
}

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
    <a className="hcns-dashboard-metric" href={href}>
      {content}
    </a>
  ) : (
    <article className="hcns-dashboard-metric">{content}</article>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="hcns-dashboard-progress">
      <header>
        <span>{label}</span>
        <strong>{value}%</strong>
      </header>
      <div>
        <span style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td className="hcns-dashboard-empty-cell" colSpan={colSpan}>
        <CheckCircle size={18} weight="duotone" aria-hidden="true" />
        {text}
      </td>
    </tr>
  );
}

function AttendancePanel({ data }: { data: HcnsDashboardData }) {
  return (
    <section className="admin-dashboard-panel" id="attendance" aria-labelledby="hcns-attendance-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>Attendance</p>
          <h2 id="hcns-attendance-title">Chấm công hôm nay</h2>
        </div>
        <Badge tone={data.attendance.needReview > 0 ? "warning" : "success"}>{data.attendance.snapshotDate}</Badge>
      </header>

      <div className="hcns-dashboard-attendance-grid">
        <article>
          <strong>{data.attendance.late}</strong>
          <span>Đi muộn</span>
        </article>
        <article>
          <strong>{data.attendance.earlyLeave}</strong>
          <span>Về sớm</span>
        </article>
        <article>
          <strong>{data.attendance.missingCheckout}</strong>
          <span>Thiếu checkout</span>
        </article>
        <article>
          <strong>{data.attendance.validRate}%</strong>
          <span>Công hợp lệ</span>
        </article>
      </div>

      <div className="hcns-dashboard-table-shell">
        <table className="hcns-dashboard-table">
          <thead>
            <tr>
              <th>Nhân sự</th>
              <th>Phòng ban</th>
              <th>Giờ ghi nhận</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {data.attendance.items.length > 0 ? (
              data.attendance.items.map((item) => (
                <tr key={item.id}>
                  <th scope="row">
                    <strong>{item.employee}</strong>
                  </th>
                  <td>{item.department}</td>
                  <td>{item.time}</td>
                  <td>
                    <Badge tone={item.status === "late" || item.status === "early_leave" ? "warning" : "danger"}>
                      {attendanceStatusLabel[item.status] ?? item.status}
                    </Badge>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={4} text="Không có bản ghi công cần xử lý trong ngày gần nhất." />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RequestsPanel({ data }: { data: HcnsDashboardData }) {
  return (
    <section className="admin-dashboard-panel" id="requests" aria-labelledby="hcns-requests-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>Approval requests</p>
          <h2 id="hcns-requests-title">Đơn từ chờ HCNS xử lý</h2>
        </div>
        <a className="secondary-button" href="/admin/approvals-alerts">
          <ClipboardText size={16} weight="duotone" aria-hidden="true" />
          Xem tất cả
        </a>
      </header>

      <div className="hcns-dashboard-table-shell">
        <table className="hcns-dashboard-table">
          <thead>
            <tr>
              <th>Đơn từ</th>
              <th>Người gửi</th>
              <th>Thời gian</th>
              <th>Thời lượng</th>
            </tr>
          </thead>
          <tbody>
            {data.requests.pending.length > 0 ? (
              data.requests.pending.map((request) => (
                <tr key={request.id}>
                  <th scope="row">
                    <strong>{request.type}</strong>
                    <small>{request.department}</small>
                  </th>
                  <td>{request.requester}</td>
                  <td>{request.dateRange}</td>
                  <td>{request.totalDays}</td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={4} text="Không còn đơn từ đang chờ HCNS xử lý." />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MovementPanel({ data }: { data: HcnsDashboardData }) {
  return (
    <section className="admin-dashboard-panel" id="people" aria-labelledby="hcns-movement-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>People movement</p>
          <h2 id="hcns-movement-title">Biến động nhân sự</h2>
        </div>
        <Badge tone="info">{data.movement.newHiresThisMonth} vào mới tháng này</Badge>
      </header>

      <div className="hcns-dashboard-split-list">
        <section aria-labelledby="hcns-new-hires-title">
          <h3 id="hcns-new-hires-title">Nhân sự mới</h3>
          {data.movement.newHires.map((employee) => (
            <article key={employee.id}>
              <span>
                <Users size={16} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <strong>{employee.employee}</strong>
                <small>{employee.title} · {employee.department}</small>
              </div>
              <time>{employee.startDate}</time>
            </article>
          ))}
        </section>

        <section aria-labelledby="hcns-probation-title">
          <h3 id="hcns-probation-title">Hết hạn thử việc</h3>
          {data.movement.probationEnding.length > 0 ? (
            data.movement.probationEnding.map((employee) => (
              <article key={employee.id}>
                <span>
                  <FileClock size={16} weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <strong>{employee.employee}</strong>
                  <small>{employee.title} · {employee.department}</small>
                </div>
                <time>{employee.officialDate}</time>
              </article>
            ))
          ) : (
            <p className="hcns-dashboard-empty-note">Không có hồ sơ thử việc cần xử lý trong 30 ngày tới.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function ContractsPanel({ data }: { data: HcnsDashboardData }) {
  return (
    <section className="admin-dashboard-panel" id="contracts" aria-labelledby="hcns-contract-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>Contracts</p>
          <h2 id="hcns-contract-title">Hợp đồng sắp hết hạn</h2>
        </div>
        <Badge tone={data.contracts.expiringCount > 0 ? "warning" : "success"}>{data.contracts.expiringCount} hồ sơ</Badge>
      </header>

      <div className="hcns-dashboard-table-shell">
        <table className="hcns-dashboard-table">
          <thead>
            <tr>
              <th>Nhân sự</th>
              <th>Loại hợp đồng</th>
              <th>Ngày hết hạn</th>
              <th>Còn lại</th>
            </tr>
          </thead>
          <tbody>
            {data.contracts.expiring.length > 0 ? (
              data.contracts.expiring.map((contract) => (
                <tr key={contract.id}>
                  <th scope="row">
                    <strong>{contract.employee}</strong>
                    <small>{contract.title}</small>
                  </th>
                  <td>{contract.type}</td>
                  <td>{contract.endDate}</td>
                  <td>
                    <Badge tone={contract.daysLeft <= 15 ? "danger" : "warning"}>{contract.daysLeft} ngày</Badge>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={4} text="Không có hợp đồng hết hạn trong 45 ngày tới." />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrganizationPanel({ data }: { data: HcnsDashboardData }) {
  return (
    <section className="admin-dashboard-panel" id="organization" aria-labelledby="hcns-org-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>Organization</p>
          <h2 id="hcns-org-title">Cơ cấu tổ chức</h2>
        </div>
        <a className="secondary-button" href="/admin/settings/org-chart">
          <ArrowSquareOut size={16} weight="duotone" aria-hidden="true" />
          Cấu hình
        </a>
      </header>
      <div className="hcns-dashboard-progress-list">
        {data.organization.departments.map((department) => (
          <ProgressRow key={department.id} label={`${department.name} · ${department.headcount} người`} value={department.percent} />
        ))}
      </div>
    </section>
  );
}

function AnalyticsPanel({ data }: { data: HcnsDashboardData }) {
  const maxSalary = Math.max(1, ...data.analytics.salaryCosts.map((item) => item.value));
  const maxFunnel = Math.max(1, ...data.analytics.recruitmentFunnel.map((item) => item.value));

  return (
    <section className="admin-dashboard-panel" id="analytics" aria-labelledby="hcns-analytics-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>BI dashboard</p>
          <h2 id="hcns-analytics-title">Phân tích HRM</h2>
        </div>
        <Badge tone="info">1ADVANCE</Badge>
      </header>

      <div className="hcns-dashboard-bi-grid">
        <article>
          <span>
            <Money size={18} weight="duotone" aria-hidden="true" />
          </span>
          <strong>Quỹ lương</strong>
          <div className="hcns-dashboard-mini-bars">
            {data.analytics.salaryCosts.map((item) => (
              <i key={item.label} style={{ height: `${Math.max(18, (item.value / maxSalary) * 70)}px` }}>
                <span>{item.label}</span>
              </i>
            ))}
          </div>
        </article>

        <article>
          <span>
            <Target size={18} weight="duotone" aria-hidden="true" />
          </span>
          <strong>KPI toàn công ty</strong>
          <ProgressRow label="Hoàn thành" value={data.analytics.kpiCompletion} />
          <small>Turnover tháng này: {data.analytics.turnoverRate}%</small>
        </article>

        <article>
          <span>
            <FunnelSimple size={18} weight="duotone" aria-hidden="true" />
          </span>
          <strong>Phễu tuyển dụng</strong>
          <div className="hcns-dashboard-funnel">
            {data.analytics.recruitmentFunnel.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <b>{item.value}</b>
                <i style={{ width: `${Math.max(16, (item.value / maxFunnel) * 100)}%` }} />
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function HrmModulesPanel({ data }: { data: HcnsDashboardData }) {
  return (
    <section className="admin-dashboard-panel" aria-labelledby="hcns-modules-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>HRM modules</p>
          <h2 id="hcns-modules-title">Dashboard nghiệp vụ</h2>
        </div>
      </header>
      <div className="hcns-dashboard-module-list">
        {data.modules.map((module) => (
          <article key={module.label}>
            <span>
              <ChartLineUp size={17} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <strong>{module.label}</strong>
              <p>{module.description}</p>
            </div>
            <div>
              <Badge tone={moduleStatusTone[module.status]}>{moduleStatusLabel[module.status]}</Badge>
              <small>{module.metric}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BirthdayPanel({ data }: { data: HcnsDashboardData }) {
  return (
    <section className="admin-dashboard-panel" aria-labelledby="hcns-birthday-title">
      <header className="admin-dashboard-panel-header">
        <div>
          <p>Internal events</p>
          <h2 id="hcns-birthday-title">Sinh nhật sắp tới</h2>
        </div>
      </header>
      <div className="hcns-dashboard-birthday-list">
        {data.movement.birthdays.map((birthday) => (
          <article key={`${birthday.name}-${birthday.date}`}>
            <span>{birthday.initials}</span>
            <div>
              <strong>{birthday.name}</strong>
              <small>{birthday.date}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HcnsDashboardBoard({ data }: HcnsDashboardBoardProps) {
  const hasVisibleWidgets = data.visibleWidgets.length > 0;
  const hasMetricWidgets = hasAnyWidget(data, ["organization", "requests", "attendance", "contracts"]);
  const hasMainWidgets = hasAnyWidget(data, ["attendance", "requests", "people", "contracts"]);
  const hasSideWidgets = hasAnyWidget(data, ["organization", "analytics", "modules", "birthdays", "shortcuts"]);
  const layoutClassName =
    hasMainWidgets && hasSideWidgets ? "hcns-dashboard-layout" : "hcns-dashboard-layout hcns-dashboard-layout--single";

  return (
    <main className="admin-dashboard-page hcns-dashboard-page" aria-label="Dashboard HCNS">
      <section className="admin-dashboard-heading" aria-labelledby="hcns-dashboard-title">
        <div>
          <p>HR command center</p>
          <h1 id="hcns-dashboard-title">Dashboard HCNS</h1>
          <span>Cập nhật {data.generatedAt}</span>
        </div>
        <div className="admin-dashboard-heading-actions">
          <a className="secondary-button" href="/apps/personnel-profile-profile">
            <Users size={16} weight="duotone" aria-hidden="true" />
            Hồ sơ nhân sự
          </a>
          <a className="primary-button" href="/apps/personnel-profile-profile/add">
            <CalendarCheck size={16} weight="duotone" aria-hidden="true" />
            Thêm nhân sự
          </a>
        </div>
      </section>

      {data.source !== "api" ? (
        <section className="account-api-banner" role="status">
          <strong>Một phần dữ liệu HCNS chưa sẵn sàng</strong>
          <span>{data.errors.slice(0, 2).join(" · ") || "Dashboard đang dùng dữ liệu dự phòng cho các widget chưa có API."}</span>
        </section>
      ) : null}

      {hasMetricWidgets ? (
        <section className="hcns-dashboard-metric-grid" aria-label="Tổng quan HCNS">
          {hasWidget(data, "organization") ? (
            <MetricCard
              detail={`${data.organization.activeEmployees} đang hoạt động`}
              href="/apps/personnel-profile-profile"
              icon={Users}
              label="Tổng nhân sự"
              value={data.organization.totalEmployees}
            />
          ) : null}
          {hasWidget(data, "requests") ? (
            <MetricCard
              detail="Đơn nghỉ, đổi ca, làm thêm"
              href="/admin/approvals-alerts"
              icon={ClipboardText}
              label="Đơn từ chờ xử lý"
              value={data.requests.pendingCount}
            />
          ) : null}
          {hasWidget(data, "attendance") ? (
            <MetricCard
              detail="Bản ghi công cần HCNS rà soát"
              icon={WarningCircle}
              label="Công cần xử lý"
              value={data.attendance.needReview}
            />
          ) : null}
          {hasWidget(data, "contracts") ? (
            <MetricCard
              detail="Trong 45 ngày tới"
              icon={Briefcase}
              label="Hợp đồng sắp hết hạn"
              value={data.contracts.expiringCount}
            />
          ) : null}
        </section>
      ) : null}

      {hasVisibleWidgets ? (
        <section className={layoutClassName}>
          {hasMainWidgets ? (
            <div className="hcns-dashboard-main">
              {hasWidget(data, "attendance") ? <AttendancePanel data={data} /> : null}
              {hasWidget(data, "requests") ? <RequestsPanel data={data} /> : null}
              {hasWidget(data, "people") ? <MovementPanel data={data} /> : null}
              {hasWidget(data, "contracts") ? <ContractsPanel data={data} /> : null}
            </div>
          ) : null}
          {hasSideWidgets ? (
            <aside className="hcns-dashboard-side">
              {hasWidget(data, "organization") ? <OrganizationPanel data={data} /> : null}
              {hasWidget(data, "analytics") ? <AnalyticsPanel data={data} /> : null}
              {hasWidget(data, "modules") ? <HrmModulesPanel data={data} /> : null}
              {hasWidget(data, "birthdays") ? <BirthdayPanel data={data} /> : null}
              {hasWidget(data, "shortcuts") ? <section className="admin-dashboard-panel" aria-labelledby="hcns-quick-title">
                <header className="admin-dashboard-panel-header">
                  <div>
                    <p>Quick access</p>
                    <h2 id="hcns-quick-title">Lối tắt HCNS</h2>
                  </div>
                </header>
                <div className="hcns-dashboard-shortcuts">
                  <a href="/apps/personnel-profile-profile/add">
                    <Users size={17} weight="duotone" aria-hidden="true" />
                    Tạo hồ sơ nhân sự
                  </a>
                  <a href="/admin/approvals-alerts">
                    <ClipboardText size={17} weight="duotone" aria-hidden="true" />
                    Duyệt đơn từ
                  </a>
                  <a href="/user?customMenu=user-board-attendance">
                    <Umbrella size={17} weight="duotone" aria-hidden="true" />
                    Bảng công
                  </a>
                  <a href="/admin/settings/org-chart">
                    <Cake size={17} weight="duotone" aria-hidden="true" />
                    Cơ cấu tổ chức
                  </a>
                </div>
              </section> : null}
            </aside>
          ) : null}
        </section>
      ) : (
        <section className="admin-dashboard-panel hcns-dashboard-empty-state">
          <strong>Chưa có widget HCNS được cấp</strong>
          <span>Admin cần cấp quyền widget trong nhóm quyền HCNS để hiển thị dashboard này.</span>
        </section>
      )}
    </main>
  );
}
