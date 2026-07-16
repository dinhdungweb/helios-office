import { Fragment, type ReactNode } from "react";
import { AccountDetailActionMenu } from "@/components/admin/account-detail-action-menu";
import { AccountGroupChangeDialog } from "@/components/admin/account-group-change-dialog";
import { FormCheckbox } from "@/components/ui/form-controls";
import {
  Apple,
  ArrowSquareOut,
  Clock,
  EnvelopeSimple,
  Key,
  LinkSimple,
  Lock,
  PlayStore,
  ShieldCheck,
  SlidersHorizontal
} from "@/lib/icons";
import type {
  AccountAccessData,
  AccountPermission,
  ManagedUserAccount,
  PermissionGroup
} from "@/lib/account-access-api";
import type { DeviceAuthRequest } from "@/lib/device-auth-api";
import {
  filterGroupPermissionSectionsByCatalog,
  groupPermissionModuleSections,
  hasGroupPermissionAction,
  type GroupPermissionItem
} from "@/lib/user-group-permission-model";

type DetailField = {
  label: string;
  value: ReactNode;
};

type DeviceRow = {
  id: string;
  device: string;
  ip?: string;
  status: "verified" | "pending" | "locked";
  state: string;
  deviceId: string;
  token?: string;
  loginAt?: string;
  logoutAt?: string;
  requestedAt?: string;
};

type ActivityItem = {
  id: string;
  actor: string;
  action: string;
  time: string;
  tone: "pink" | "green";
  details: string[];
};

const statusLabels: Record<ManagedUserAccount["status"], string> = {
  active: "Kích hoạt",
  closed: "Đã khóa",
  pending_activation: "Chờ kích hoạt"
};

function accountLogin(account: ManagedUserAccount) {
  return account.email.includes("@") ? account.email.split("@")[0] : account.email;
}

function groupNameFor(account: ManagedUserAccount, groups: PermissionGroup[]) {
  return account.groupId ? groups.find((group) => group.id === account.groupId)?.name ?? "--" : "--";
}

function stablePhone(account: ManagedUserAccount) {
  const source = `${account.employeeCode ?? account.id}${account.email}`;
  const digits = Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0);

  return `09${String(78000000 + (digits % 999999)).padStart(8, "0")}`;
}

function tokenSeed(account: ManagedUserAccount, index: number) {
  const compactId = account.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const seed = compactId || accountLogin(account).toUpperCase();

  return `${seed.slice(0, 12)}${index}OU_VTMe_5QSvzgLVzQPFlxXAVfCoZaTf-hS5avCKMwoDFcHSHtBcrobrhuYKYTm8VEdHRMqe_Ot-Orczye1w98P`;
}

function deviceKind(deviceName: string) {
  return deviceName.toLowerCase().includes("iphone") || deviceName.toLowerCase().includes("ios") ? "ios" : "android";
}

function deviceState(status: DeviceAuthRequest["status"]) {
  switch (status) {
    case "approved":
      return "Đã xác thực";
    case "locked":
      return "Đã khóa";
    default:
      return "Chưa xác thực";
  }
}

function buildDeviceRows(account: ManagedUserAccount, requests: DeviceAuthRequest[]): DeviceRow[] {
  const matches = requests.filter(
    (request) =>
      request.employeeCode === account.employeeCode ||
      request.employeeName.toLowerCase() === account.name.toLowerCase()
  );

  if (matches.length > 0) {
    return matches.slice(0, 2).map((request) => ({
      id: request.id,
      device: deviceKind(request.deviceName),
      status: request.status === "approved" ? "verified" : request.status === "locked" ? "locked" : "pending",
      state: deviceState(request.status),
      deviceId: request.deviceId,
      loginAt: request.lastUsedAt ?? "--",
      logoutAt: "--",
      requestedAt: request.submittedAt
    }));
  }

  return [
    {
      id: `${account.id}-phone-1`,
      device: "ios",
      status: "pending",
      state: "Chưa xác thực",
      deviceId: "45589579-819D-4D0D-B4A8-7AA21B513DDA"
    },
    {
      id: `${account.id}-phone-2`,
      device: "ios",
      status: "verified",
      state: "Đã xác thực",
      deviceId: "34DF52DC-DBEB-471D-9194-149B145BF600"
    }
  ];
}

function buildTokenRows(account: ManagedUserAccount, devices: DeviceRow[]) {
  return devices.map((device, index) => ({
    ...device,
    ip: index === 0 ? "116.96.44.108" : "42.115.81.251",
    token: tokenSeed(account, index + 1),
    loginAt: device.loginAt ?? (index === 0 ? "17:52:51 17/10/2025" : "11:09:31 30/06/2026"),
    logoutAt: device.logoutAt ?? "--",
    requestedAt: device.requestedAt ?? "--"
  }));
}

function buildActivities(account: ManagedUserAccount, groupName: string): ActivityItem[] {
  const customPermission = account.customPermissionKeys.length > 0 ? "Có" : "Không";

  return [
    {
      id: "account-edited-1",
      actor: "Admin",
      action: "đã sửa tài khoản",
      time: "15:47 ngày 16/04/2026",
      tone: "pink",
      details: [`Không thay đổi nhóm người dùng`, `Tùy chỉnh quyền: ${customPermission}`, "Phân quyền: Chi tiết"]
    },
    {
      id: "account-edited-2",
      actor: "Admin",
      action: "đã sửa tài khoản",
      time: "15:46 ngày 16/04/2026",
      tone: "pink",
      details: [`Không thay đổi nhóm người dùng`, `Tùy chỉnh quyền: ${customPermission}`, "Phân quyền: Chi tiết"]
    },
    {
      id: "account-group-edited",
      actor: "Admin",
      action: "đã sửa nhóm người dùng",
      time: "17:20 ngày 20/10/2025",
      tone: "green",
      details: [`Tên nhóm: ${groupName}`, "Giữ quyền tùy chỉnh do tài khoản đã được cấu hình riêng", "Phân quyền: Chi tiết"]
    },
    {
      id: "account-system-edited",
      actor: "Hệ thống",
      action: "đã sửa tài khoản",
      time: "16:33 ngày 20/10/2025",
      tone: "pink",
      details: [`Không thay đổi nhóm người dùng`, `Tùy chỉnh quyền: ${customPermission}`, "Phân quyền: Chi tiết"]
    },
    {
      id: "account-person-edited",
      actor: account.name,
      action: "đã sửa tài khoản",
      time: "11:53 ngày 27/02/2024",
      tone: "pink",
      details: [`Không thay đổi nhóm người dùng`, `Tùy chỉnh quyền: ${customPermission}. Kế thừa quyền của nhóm ${groupName}`, "Phân quyền: Chi tiết"]
    }
  ];
}

function DetailPanel({
  action,
  children,
  className,
  title
}: {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  title: string;
}) {
  const titleId = `account-detail-${title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "") || "panel"}`;

  return (
    <section className={className ? `admin-account-detail-panel ${className}` : "admin-account-detail-panel"} aria-labelledby={titleId}>
      <header className="admin-account-detail-panel-header">
        <h2 id={titleId}>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function FieldGrid({ fields }: { fields: DetailField[] }) {
  return (
    <dl className="admin-account-field-grid">
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TableToolbar({ count }: { count: number }) {
  return (
    <div className="admin-account-table-toolbar">
      <SlidersHorizontal size={17} weight="duotone" aria-hidden="true" />
      <span>Hiển thị 1 - {count} / {count} bản ghi</span>
    </div>
  );
}

function DeviceIcon({ device }: { device: string }) {
  const DeviceGlyph = device === "ios" ? Apple : PlayStore;

  return (
    <span className="admin-account-device-icon" aria-hidden="true">
      <DeviceGlyph size={13} weight="duotone" />
    </span>
  );
}

function DeviceStatusDot({ status }: { status: DeviceRow["status"] }) {
  return <span className={`admin-account-device-dot is-${status}`} aria-hidden="true" />;
}

function PermissionCheckbox({ checked }: { checked: boolean }) {
  return (
    <FormCheckbox
      checked={checked}
      className="admin-account-permission-checkbox"
      label={<span className="sr-only">{checked ? "Được cấp quyền" : "Không được cấp quyền"}</span>}
      readOnly
    />
  );
}

function permissionActionText(permission: AccountPermission, column: "manage" | "view" | "create") {
  if (permission.adminOnly && column !== "manage") {
    return "--";
  }

  if (column === "manage") {
    return "Quản lý tất cả";
  }

  if (column === "view") {
    return permission.key.includes("create") ? "--" : "Xem tất cả";
  }

  return permission.key.includes("view") ? "--" : "Tạo mới";
}

function PermissionDetailTable({
  account,
  permissions
}: {
  account: ManagedUserAccount;
  permissions: AccountPermission[];
}) {
  const allowedKeys = new Set(account.effectivePermissionKeys);
  const groupedPermissions = permissions
    .filter((permission) => !permission.key.startsWith("permission."))
    .reduce<Array<{ category: string; items: AccountPermission[] }>>((groups, permission) => {
      const existing = groups.find((group) => group.category === permission.category);

      if (existing) {
        existing.items.push(permission);
      } else {
        groups.push({ category: permission.category, items: [permission] });
      }

      return groups;
    }, []);

  return (
    <div className="admin-account-permission-shell" tabIndex={0} aria-label="Bảng chi tiết quyền có thể cuộn ngang">
      <table className="admin-account-permission-table">
        <thead>
          <tr>
            <th scope="col">Đối tượng</th>
            <th scope="col">Quản lý</th>
            <th scope="col">Xem</th>
            <th scope="col">Tạo mới</th>
          </tr>
        </thead>
        <tbody>
          {groupedPermissions.map((group) => {
            const groupChecked = group.items.some((permission) => allowedKeys.has(permission.key));

            return (
              <Fragment key={group.category}>
                <tr className="is-category">
                  <th scope="row">
                    <PermissionCheckbox checked={groupChecked} />
                    <strong>{group.category}</strong>
                  </th>
                  <td>--</td>
                  <td>--</td>
                  <td>--</td>
                </tr>
                {group.items.map((permission) => {
                  const checked = allowedKeys.has(permission.key);

                  return (
                    <tr key={permission.key}>
                      <th scope="row">
                        <PermissionCheckbox checked={checked} />
                        <span>{permission.label}</span>
                      </th>
                      <td>{checked ? permissionActionText(permission, "manage") : "--"}</td>
                      <td>{checked ? permissionActionText(permission, "view") : "--"}</td>
                      <td>{checked ? permissionActionText(permission, "create") : "--"}</td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
          {groupedPermissions.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <span className="account-empty-state">Chưa có dữ liệu phân quyền.</span>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function isPermissionModuleSelected(item: GroupPermissionItem, allowedKeys: Set<string>) {
  return item.permissionKeys.some((permissionKey) => allowedKeys.has(permissionKey));
}

function ModulePermissionDetailTable({
  account,
  data
}: {
  account: ManagedUserAccount;
  data: AccountAccessData;
}) {
  const allowedKeys = new Set(account.effectivePermissionKeys);
  const sections = filterGroupPermissionSectionsByCatalog(groupPermissionModuleSections, data.permissions)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isPermissionModuleSelected(item, allowedKeys))
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="admin-account-permission-shell" tabIndex={0} aria-label="Bảng chi tiết quyền có thể cuộn ngang">
      <table className="admin-account-permission-table">
        <thead>
          <tr>
            <th scope="col">Đối tượng</th>
            <th scope="col">Quản lý</th>
            <th scope="col">Xem</th>
            <th scope="col">Tạo mới</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.category}>
              <tr className="is-category">
                <th scope="row">
                  <PermissionCheckbox checked />
                  <strong>{section.category}</strong>
                </th>
                <td>--</td>
                <td>--</td>
                <td>--</td>
              </tr>
              {section.items.map((item) => (
                <tr key={item.id}>
                  <th scope="row">
                    <PermissionCheckbox checked />
                    <span>{item.label}</span>
                  </th>
                  <td>{hasGroupPermissionAction(item, allowedKeys, "manage") ? item.manage ?? "--" : "--"}</td>
                  <td>{hasGroupPermissionAction(item, allowedKeys, "view") ? item.view ?? "--" : "--"}</td>
                  <td>{hasGroupPermissionAction(item, allowedKeys, "create") ? item.create ?? "--" : "--"}</td>
                </tr>
              ))}
            </Fragment>
          ))}
          {sections.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <span className="account-empty-state">Chưa có dữ liệu phân quyền.</span>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTimeline({ activities, account }: { activities: ActivityItem[]; account: ManagedUserAccount }) {
  return (
    <div className="admin-account-activity-list">
      {activities.map((activity) => (
        <article className="admin-account-activity-item" key={activity.id}>
          <span className={`admin-account-activity-marker is-${activity.tone}`} aria-hidden="true">
            <LinkSimple size={12} weight="duotone" />
          </span>
          <section>
            <header>
              <h3>
                <strong>{activity.actor}</strong> {activity.action}
                <ArrowSquareOut size={14} weight="duotone" aria-hidden="true" />
              </h3>
              <span className="admin-account-activity-avatar" aria-hidden="true">{account.avatar}</span>
            </header>
            <p>
              <Clock size={13} weight="duotone" aria-hidden="true" />
              {activity.time}
            </p>
            <div>
              {activity.details.map((detail) => (
                <span key={detail}>{detail}</span>
              ))}
            </div>
          </section>
        </article>
      ))}
      <button className="admin-account-activity-more" type="button">Xem thêm</button>
    </div>
  );
}

export function AdminUserDetailBoard({
  account,
  data,
  deviceRequests
}: {
  account: ManagedUserAccount;
  data: AccountAccessData;
  deviceRequests: DeviceAuthRequest[];
}) {
  const groupName = groupNameFor(account, data.groups);
  const phone = stablePhone(account);
  const deviceRows = buildDeviceRows(account, deviceRequests);
  const tokenRows = buildTokenRows(account, deviceRows);
  const activities = buildActivities(account, groupName);
  const accountFields: DetailField[] = [
    { label: "Tài khoản", value: account.customPermissionKeys.length > 0 ? `${accountLogin(account)} ★` : accountLogin(account) },
    { label: "Nhóm", value: groupName },
    { label: "Tùy chỉnh quyền", value: account.customPermissionKeys.length > 0 ? "Có" : "Không" },
    { label: "Vai trò người dùng", value: account.role === "system_admin" ? "Admin hệ thống" : "--" },
    {
      label: "Trạng thái",
      value: <span className={`admin-account-status-pill is-${account.status}`}>{statusLabels[account.status]}</span>
    },
    { label: "Ngày kích hoạt", value: account.activatedAt ?? "--" }
  ];
  const employeeFields: DetailField[] = [
    { label: "Mã NS", value: account.employeeCode ?? "--" },
    { label: "Họ tên", value: account.name },
    { label: "Phòng ban", value: account.department === "--" ? "--" : `SRG › ${account.department}` },
    { label: "Vị trí", value: account.title },
    { label: "Email", value: account.email },
    { label: "Quê quán", value: "--" },
    { label: "Điện thoại", value: phone },
    { label: "Ngày sinh", value: "--" }
  ];

  return (
    <main className="admin-account-detail-page" aria-label={`Chi tiết tài khoản ${account.name}`}>
      <section className="admin-account-detail-actionbar" aria-label="Tác vụ tài khoản">
        <AccountGroupChangeDialog account={account} groups={data.groups} permissions={data.permissions} />
        <button className="admin-account-action-button" type="button">
          <EnvelopeSimple size={15} weight="duotone" aria-hidden="true" />
          Gửi mật khẩu
        </button>
        <button className="admin-account-action-button" type="button">
          <Key size={15} weight="duotone" aria-hidden="true" />
          Đổi mật khẩu
        </button>
        <button className="admin-account-action-button" type="button">
          <ShieldCheck size={15} weight="duotone" aria-hidden="true" />
          Tạo chữ ký số
        </button>
        <button className="admin-account-action-button" type="button">
          <Lock size={15} weight="duotone" aria-hidden="true" />
          Khóa
        </button>
        <AccountDetailActionMenu accountId={account.id} />
      </section>

      <div className="admin-account-detail-layout">
        <div className="admin-account-detail-main">
          <DetailPanel title="Thông tin tài khoản">
            <FieldGrid fields={accountFields} />
          </DetailPanel>

          <DetailPanel title="Thông tin nhân sự">
            <FieldGrid fields={employeeFields} />
          </DetailPanel>

          <DetailPanel title="Danh sách điện thoại xác thực">
            <TableToolbar count={deviceRows.length} />
            <div className="admin-account-table-shell" tabIndex={0} aria-label="Danh sách điện thoại xác thực có thể cuộn ngang">
              <table className="admin-account-device-table">
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="sr-only">Chọn</span>
                    </th>
                    <th scope="col">Thiết bị</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Tình trạng</th>
                    <th scope="col">ID thiết bị</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceRows.map((device) => (
                    <tr key={device.id}>
                      <td>
                        <FormCheckbox className="admin-account-table-checkbox" label={<span className="sr-only">Chọn thiết bị {device.deviceId}</span>} />
                      </td>
                      <td>
                        <span className="admin-account-device-name">
                          <DeviceIcon device={device.device} />
                          {device.device}
                        </span>
                      </td>
                      <td><DeviceStatusDot status={device.status} /></td>
                      <td><span className={`admin-account-device-state is-${device.status}`}>{device.state}</span></td>
                      <td>{device.deviceId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailPanel>

          <DetailPanel title="Danh sách token nhận thông báo">
            <TableToolbar count={tokenRows.length} />
            <div className="admin-account-table-shell" tabIndex={0} aria-label="Danh sách token nhận thông báo có thể cuộn ngang">
              <table className="admin-account-token-table">
                <thead>
                  <tr>
                    <th scope="col">Thiết bị</th>
                    <th scope="col">IP</th>
                    <th scope="col">ID thiết bị</th>
                    <th scope="col">Token</th>
                    <th scope="col">Đăng nhập</th>
                    <th scope="col">Đăng xuất</th>
                    <th scope="col">Ngày yêu cầu</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenRows.map((device) => (
                    <tr key={`${device.id}-token`}>
                      <td>
                        <span className="admin-account-device-name">
                          <DeviceIcon device={device.device} />
                          {device.device}
                        </span>
                      </td>
                      <td>{device.ip}</td>
                      <td>{device.deviceId}</td>
                      <td><span className="admin-account-token-value">{device.token}</span></td>
                      <td>{device.loginAt}</td>
                      <td>{device.logoutAt}</td>
                      <td>{device.requestedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailPanel>

          <DetailPanel title="Chi tiết quyền" className="admin-account-permission-panel">
            <ModulePermissionDetailTable account={account} data={data} />
          </DetailPanel>
        </div>

        <aside className="admin-account-detail-side" aria-label="Thông tin bổ sung tài khoản">
          <DetailPanel title="Lịch sử hoạt động" className="admin-account-activity-panel">
            <ActivityTimeline account={account} activities={activities} />
          </DetailPanel>
        </aside>
      </div>
    </main>
  );
}
