import {
  Bell,
  CheckCircle,
  Clock,
  FunnelSimple,
  GlobeHemisphereWest,
  Lock,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Trash,
  Users,
  X
} from "@/lib/icons";
import {
  deviceAuthPolicy,
  deviceAuthRequests,
  type DeviceAuthRequest,
  type DeviceAuthStatus
} from "@/lib/mock-data";

const statusLabels: Record<DeviceAuthStatus, string> = {
  pending: "Chờ xác thực",
  approved: "Đã xác thực",
  rejected: "Đã từ chối",
  locked: "Đã khóa"
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: X,
  locked: Lock
};

function DeviceStatusBadge({ status }: { status: DeviceAuthStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <span className={`device-status device-status--${status}`}>
      <StatusIcon size={14} weight="duotone" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function DeviceAvatar({ request }: { request: DeviceAuthRequest }) {
  return (
    <span className="device-person-avatar" aria-hidden="true">
      {request.avatar}
    </span>
  );
}

function DeviceSummary() {
  const pendingCount = deviceAuthRequests.filter((request) => request.status === "pending").length;
  const approvedCount = deviceAuthRequests.filter((request) => request.status === "approved").length;
  const rejectedCount = deviceAuthRequests.filter((request) => request.status === "rejected").length;
  const lockedCount = deviceAuthRequests.filter((request) => request.status === "locked").length;
  const summaryItems = [
    { label: "Chờ xác thực", value: pendingCount, icon: Clock },
    { label: "Đã xác thực", value: approvedCount, icon: ShieldCheck },
    { label: "Đã từ chối", value: rejectedCount, icon: X },
    { label: "Đang khóa", value: lockedCount, icon: Lock }
  ];

  return (
    <section className="account-summary-grid" aria-label="Tổng quan xác thực thiết bị">
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

function DeviceFilterRow() {
  const departments = Array.from(new Set(deviceAuthRequests.map((request) => request.department)));
  const branches = Array.from(new Set(deviceAuthRequests.map((request) => request.branch)));

  return (
    <div className="account-filter-row device-filter-row" aria-label="Bộ lọc xác thực thiết bị">
      {(["pending", "approved", "rejected"] as const).map((status) => (
        <button className={status === "pending" ? "is-selected" : undefined} type="button" key={status}>
          {statusLabels[status]}
        </button>
      ))}
      {departments.map((department) => (
        <button type="button" key={department}>
          {department}
        </button>
      ))}
      {branches.map((branch) => (
        <button type="button" key={branch}>
          {branch}
        </button>
      ))}
    </div>
  );
}

function DeviceActions({ request }: { request: DeviceAuthRequest }) {
  const canApprove = request.status === "pending" || request.status === "rejected";
  const canReject = request.status === "pending";
  const canLock = request.status === "approved";

  return (
    <div className="device-action-list" aria-label={`Tác vụ thiết bị của ${request.employeeName}`}>
      <button className="device-action-button device-action-button--approve" disabled={!canApprove} type="button">
        <CheckCircle size={14} weight="duotone" aria-hidden="true" />
        Xác thực
      </button>
      <button className="device-action-button device-action-button--reject" disabled={!canReject} type="button">
        <X size={14} weight="duotone" aria-hidden="true" />
        Từ chối
      </button>
      <button className="device-action-button" disabled={!canLock} type="button">
        <Lock size={14} weight="duotone" aria-hidden="true" />
        Khóa
      </button>
      <button className="icon-button device-delete-button" type="button" aria-label={`Xóa thiết bị ${request.deviceName}`}>
        <Trash size={15} weight="duotone" aria-hidden="true" />
      </button>
    </div>
  );
}

function DeviceRequestTable() {
  return (
    <section className="account-panel device-table-panel" aria-labelledby="device-table-title">
      <header className="account-panel-header">
        <div>
          <h2 id="device-table-title">Danh sách yêu cầu xác thực thiết bị</h2>
          <p>{deviceAuthRequests.length} thiết bị từ App chấm công GPS/Wifi</p>
        </div>
        <div className="account-panel-actions">
          <button className="secondary-button" type="button">
            <FunnelSimple size={16} weight="duotone" aria-hidden="true" />
            Bộ lọc
          </button>
          <button className="secondary-button" type="button">
            <SlidersHorizontal size={16} weight="duotone" aria-hidden="true" />
            Cột
          </button>
        </div>
      </header>

      <DeviceFilterRow />

      <div className="account-table-shell" tabIndex={0} aria-label="Bảng yêu cầu thiết bị có thể cuộn ngang">
        <table className="account-table device-auth-table">
          <thead>
            <tr>
              <th scope="col">Nhân sự</th>
              <th scope="col">Thiết bị</th>
              <th scope="col">Device ID</th>
              <th scope="col">Ngày gửi</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Tác vụ</th>
            </tr>
          </thead>
          <tbody>
            {deviceAuthRequests.map((request) => (
              <tr key={request.id}>
                <th scope="row">
                  <span className="account-person-cell">
                    <DeviceAvatar request={request} />
                    <span>
                      <strong>{request.employeeName}</strong>
                      <small>{request.employeeCode} · {request.department}</small>
                    </span>
                  </span>
                </th>
                <td>
                  <span className="device-name-cell">
                    <Phone size={16} weight="duotone" aria-hidden="true" />
                    <span>
                      <strong>{request.deviceName}</strong>
                      <small>{request.branch}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <code>{request.deviceId}</code>
                  {request.note ? <small>{request.note}</small> : null}
                </td>
                <td>
                  <span>{request.submittedAt}</span>
                  {request.lastUsedAt ? <small>Dùng gần nhất: {request.lastUsedAt}</small> : null}
                </td>
                <td>
                  <DeviceStatusBadge status={request.status} />
                </td>
                <td>
                  <DeviceActions request={request} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DevicePolicyPanel() {
  const settings = [
    {
      label: "Giới hạn thiết bị",
      value: `${deviceAuthPolicy.maxDevicesPerUser} thiết bị / nhân viên`,
      icon: Phone
    },
    {
      label: "Thông báo App",
      value: deviceAuthPolicy.requireNotificationEnabled ? "Bắt buộc bật thông báo" : "Không bắt buộc",
      icon: Bell
    },
    {
      label: "GPS chấm công",
      value: deviceAuthPolicy.requireGpsForAttendance ? "Bắt buộc định vị" : "Không bắt buộc",
      icon: GlobeHemisphereWest
    },
    {
      label: "Wifi văn phòng",
      value: deviceAuthPolicy.requireWifiForOffice ? "Kiểm tra theo dải mạng" : "Không kiểm tra",
      icon: ShieldCheck
    }
  ];

  return (
    <section className="account-panel" aria-labelledby="device-policy-title">
      <header className="account-panel-header">
        <div>
          <h2 id="device-policy-title">Cài đặt nâng cao</h2>
          <p>Quy tắc kiểm soát thiết bị chấm công</p>
        </div>
      </header>

      <div className="device-policy-list">
        {settings.map((setting) => (
          <article key={setting.label}>
            <span>
              <setting.icon size={17} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{setting.label}</h3>
              <p>{setting.value}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DeviceAdminNotesPanel() {
  const notes = [
    "Nhân viên phải bật thông báo cho App trước khi gửi yêu cầu xác thực.",
    deviceAuthPolicy.approvalRefreshHint,
    "Khi nhân viên mất máy hoặc đổi máy, Admin nên xóa thiết bị cũ trước khi duyệt thiết bị mới."
  ];

  return (
    <section className="account-panel" aria-labelledby="device-note-title">
      <header className="account-panel-header">
        <div>
          <h2 id="device-note-title">Lưu ý cho Admin</h2>
          <p>Các bước giúp trạng thái cập nhật đúng trên App</p>
        </div>
      </header>

      <div className="device-note-list">
        {notes.map((note) => (
          <article key={note}>
            <span>
              <CheckCircle size={15} weight="duotone" aria-hidden="true" />
            </span>
            <p>{note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DeviceScopePanel() {
  const pendingByDepartment = Array.from(new Set(deviceAuthRequests.map((request) => request.department))).map(
    (department) => ({
      department,
      count: deviceAuthRequests.filter((request) => request.department === department && request.status === "pending").length
    })
  );

  return (
    <section className="account-panel" aria-labelledby="device-scope-title">
      <header className="account-panel-header">
        <div>
          <h2 id="device-scope-title">Theo phòng ban</h2>
          <p>Lọc nhanh yêu cầu cần xử lý</p>
        </div>
      </header>

      <div className="device-scope-list">
        {pendingByDepartment.map((item) => (
          <article key={item.department}>
            <span>
              <Users size={16} weight="duotone" aria-hidden="true" />
            </span>
            <strong>{item.department}</strong>
            <p>{item.count} yêu cầu chờ</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DeviceAuthSettingsBoard() {
  return (
    <main className="account-access-page device-auth-page" aria-label="Xác thực thiết bị chấm công">
      <section className="org-page-heading" aria-labelledby="device-auth-page-title">
        <div>
          <span>Cài đặt hệ thống · Tài khoản người dùng</span>
          <h1 id="device-auth-page-title">Xác thực thiết bị</h1>
          <p>Quản lý điện thoại cá nhân được phép chấm công qua App, GPS và Wifi.</p>
        </div>
        <a className="secondary-button" href="/admin/settings/accounts">
          Quay lại tài khoản
        </a>
      </section>

      <DeviceSummary />

      <section className="account-access-layout" aria-label="Quản lý xác thực thiết bị">
        <div className="account-access-main">
          <DeviceRequestTable />
        </div>
        <aside className="account-access-side" aria-label="Cài đặt và lưu ý thiết bị">
          <DevicePolicyPanel />
          <DeviceScopePanel />
          <DeviceAdminNotesPanel />
        </aside>
      </section>
    </main>
  );
}
