import {
  CheckCircle,
  Clock,
  EnvelopeSimple,
  FileClock,
  Key,
  Lock,
  PaperPlaneTilt,
  ShieldCheck,
  WarningCircle,
  X
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import {
  smtpAuthSettings,
  smtpDeliverySettings,
  smtpEmailLogs,
  smtpSenderIdentity,
  smtpServerSettings,
  type SmtpConfigItem,
  type SmtpConfigStatus,
  type SmtpEmailLog
} from "@/lib/mock-data";

const statusLabels: Record<SmtpConfigStatus, string> = {
  active: "Đang hoạt động",
  review: "Cần kiểm tra",
  error: "Có lỗi",
  disabled: "Đang tắt"
};

const statusIcons: Record<SmtpConfigStatus, Icon> = {
  active: CheckCircle,
  review: WarningCircle,
  error: X,
  disabled: Clock
};

const logStatusLabels: Record<SmtpEmailLog["status"], string> = {
  sent: "Thành công",
  failed: "Thất bại",
  queued: "Đang chờ"
};

function SmtpStatusBadge({ status }: { status: SmtpConfigStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <span className={`smtp-status smtp-status--${status}`}>
      <StatusIcon size={14} weight="duotone" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function SmtpSummary() {
  const failedLogs = smtpEmailLogs.filter((log) => log.status === "failed").length;
  const reviewItems = [...smtpServerSettings, ...smtpAuthSettings, ...smtpDeliverySettings].filter(
    (item) => item.status === "review"
  ).length;
  const summaryItems = [
    { label: "Trạng thái SMTP", value: "ON", icon: EnvelopeSimple },
    { label: "Giới hạn/ngày", value: "1.500", icon: PaperPlaneTilt },
    { label: "Cần kiểm tra", value: reviewItems, icon: WarningCircle },
    { label: "Email lỗi", value: failedLogs, icon: X }
  ];

  return (
    <section className="account-summary-grid" aria-label="Tổng quan SMTP">
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

function SmtpConfigList({ items, icon: RowIcon }: { items: SmtpConfigItem[]; icon: Icon }) {
  return (
    <div className="smtp-config-list">
      {items.map((item) => (
        <article key={item.id}>
          <span>
            <RowIcon size={17} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <header>
              <div>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </div>
              <SmtpStatusBadge status={item.status} />
            </header>
            <strong>{item.value}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

function ServerPanel() {
  return (
    <section className="account-panel" aria-labelledby="smtp-server-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-server-title">Thông tin máy chủ</h2>
          <p>Host, port và giao thức bảo mật do nhà cung cấp email cấp.</p>
        </div>
      </header>

      <SmtpConfigList icon={EnvelopeSimple} items={smtpServerSettings} />
    </section>
  );
}

function AuthPanel() {
  return (
    <section className="account-panel" aria-labelledby="smtp-auth-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-auth-title">Tài khoản gửi</h2>
          <p>Email đăng nhập, mật khẩu ứng dụng và phương thức xác thực.</p>
        </div>
      </header>

      <SmtpConfigList icon={Key} items={smtpAuthSettings} />
    </section>
  );
}

function SenderPanel() {
  return (
    <section className="account-panel" aria-labelledby="smtp-sender-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-sender-title">Thông tin hiển thị</h2>
          <p>Cách người nhận nhìn thấy email trong hộp thư.</p>
        </div>
      </header>

      <SmtpConfigList icon={PaperPlaneTilt} items={smtpSenderIdentity} />
    </section>
  );
}

function DeliveryPanel() {
  return (
    <section className="account-panel" aria-labelledby="smtp-delivery-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-delivery-title">Kiểm soát gửi thư</h2>
          <p>Trạng thái sử dụng, giới hạn gửi và cấu hình DNS chống spam.</p>
        </div>
      </header>

      <SmtpConfigList icon={ShieldCheck} items={smtpDeliverySettings} />
    </section>
  );
}

function TestConnectionPanel() {
  return (
    <section className="account-panel" aria-labelledby="smtp-test-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-test-title">Gửi thử email</h2>
          <p>Kiểm tra kết nối sau khi cập nhật thông số SMTP.</p>
        </div>
        <button className="primary-button" type="button">
          <PaperPlaneTilt size={16} weight="duotone" aria-hidden="true" />
          Gửi thử
        </button>
      </header>

      <div className="smtp-test-box">
        <span>
          <EnvelopeSimple size={18} weight="duotone" aria-hidden="true" />
        </span>
        <div>
          <strong>Email nhận thử</strong>
          <p>admin@helios.vn</p>
        </div>
      </div>
    </section>
  );
}

function EmailLogPanel() {
  return (
    <section className="account-panel" aria-labelledby="smtp-log-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-log-title">Log Email</h2>
          <p>Lịch sử gửi tự động, trạng thái và lỗi trả về từ máy chủ nhận.</p>
        </div>
      </header>

      <div className="smtp-log-list">
        {smtpEmailLogs.map((log) => (
          <article className={`smtp-log-row smtp-log-row--${log.status}`} key={log.id}>
            <span>
              <FileClock size={16} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{log.template}</h3>
              <p>{log.recipient}</p>
              <small>{log.detail}</small>
            </div>
            <div>
              <strong>{logStatusLabels[log.status]}</strong>
              <time>{log.time}</time>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminNotesPanel() {
  const notes = [
    {
      title: "Dùng App Password",
      body: "Không dùng mật khẩu đăng nhập thông thường. Gmail và Outlook thường yêu cầu mật khẩu ứng dụng hoặc SMTP AUTH.",
      icon: Lock
    },
    {
      title: "Theo dõi giới hạn gửi",
      body: "Gmail/Outlook thường giới hạn 500-2000 email mỗi ngày. Email marketing số lượng lớn nên dùng SES, SendGrid hoặc Mailchimp.",
      icon: WarningCircle
    },
    {
      title: "Cấu hình SPF/DKIM",
      body: "Nhờ kỹ thuật cấu hình DNS để email không rơi vào Spam hoặc bị đánh dấu giả mạo tên miền.",
      icon: ShieldCheck
    }
  ];

  return (
    <section className="account-panel" aria-labelledby="smtp-note-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-note-title">Lưu ý cho Admin</h2>
          <p>Các điểm quan trọng trước khi bật SMTP chính thức.</p>
        </div>
      </header>

      <div className="smtp-note-list">
        {notes.map((note) => (
          <article key={note.title}>
            <span>
              <note.icon size={17} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{note.title}</h3>
              <p>{note.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SmtpSettingsBoard() {
  return (
    <main className="account-access-page smtp-settings-page" aria-label="Cấu hình SMTP">
      <section className="org-page-heading" aria-labelledby="smtp-page-title">
        <div>
          <span>Cài đặt hệ thống</span>
          <h1 id="smtp-page-title">Cấu hình SMTP</h1>
          <p>Thiết lập máy chủ gửi thư để hệ thống gửi phiếu lương, thông báo duyệt đơn, hợp đồng và email tự động.</p>
        </div>
        <a className="secondary-button" href="/admin/settings#system-settings">
          Quay lại cài đặt
        </a>
      </section>

      <SmtpSummary />

      <section className="account-access-layout" aria-label="Thiết lập SMTP">
        <div className="account-access-main">
          <ServerPanel />
          <AuthPanel />
          <EmailLogPanel />
        </div>

        <aside className="account-access-side" aria-label="Kiểm tra và quản lý SMTP">
          <SenderPanel />
          <DeliveryPanel />
          <TestConnectionPanel />
          <AdminNotesPanel />
        </aside>
      </section>
    </main>
  );
}
