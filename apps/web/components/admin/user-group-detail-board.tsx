import { Fragment, type ReactNode } from "react";
import { FormCheckbox } from "@/components/ui/form-controls";
import {
  ArrowSquareOut,
  Clock,
  FileClock,
  FileText,
  MagicWand,
  PencilSimple,
  SlidersHorizontal,
  WarningCircle
} from "@/lib/icons";
import type {
  AccountAccessData,
  ManagedUserAccount,
  PermissionGroup
} from "@/lib/account-access-api";
import {
  filterGroupPermissionSectionsByCatalog,
  groupPermissionModuleSections,
  hasGroupPermissionAction,
  hasGroupSystemPermissions,
  type GroupPermissionItem
} from "@/lib/user-group-permission-model";

type DetailField = {
  label: string;
  value: ReactNode;
};

type PermissionItem = {
  create?: string;
  label: string;
  manage?: string;
  view?: string;
};

type PermissionSection = {
  category: string;
  items: PermissionItem[];
};

type ActivityItem = {
  action: string;
  details: string[];
  id: string;
  tone: "orange" | "green";
  time: string;
};

const permissionSections: PermissionSection[] = [
  {
    category: "NHÂN SỰ",
    items: [
      { label: "Hồ sơ nhân sự", manage: "Quản lý tất cả", view: "Xem tất cả", create: "Tạo mới" },
      { label: "Hợp đồng", manage: "Quản lý tất cả", view: "Xem tất cả", create: "Tạo mới" },
      { label: "Quyết định", manage: "Quản lý tất cả", view: "Xem tất cả", create: "Tạo mới" }
    ]
  },
  {
    category: "TUYỂN DỤNG",
    items: [
      { label: "Đề xuất tuyển", manage: "Quản lý tất cả", view: "Xem tất cả", create: "Tạo mới" },
      { label: "Tuyển dụng", manage: "Quản lý tất cả", view: "Xem tất cả", create: "Tạo mới" },
      { label: "Chăm sóc", manage: "Quản lý tất cả", view: "Xem tất cả", create: "Tạo mới" }
    ]
  },
  {
    category: "CHẤM CÔNG",
    items: [
      { label: "Chấm công", manage: "Quản lý tất cả", view: "Xem tất cả", create: "Tạo mới" },
      { label: "Bảng chấm công", create: "Không tạo mới" }
    ]
  },
  {
    category: "BẢNG LƯƠNG",
    items: [
      { label: "Bảng lương" },
      { label: "Loại bảng lương", create: "Không tạo mới" }
    ]
  },
  {
    category: "ĐƠN TỪ",
    items: [{ label: "Đơn từ", create: "Không tạo mới" }]
  },
  {
    category: "TÀI SẢN",
    items: [{ label: "Tài sản", create: "Không tạo mới" }]
  },
  {
    category: "BẢO HIỂM",
    items: [{ label: "IVAN", create: "Không tạo mới" }]
  },
  {
    category: "LỊCH BIỂU",
    items: [{ label: "Sự kiện", create: "Không tạo mới" }]
  },
  {
    category: "TÀI LIỆU",
    items: [
      { label: "Tài liệu công ty" },
      { label: "Tài liệu cá nhân", create: "Không tạo mới" }
    ]
  },
  {
    category: "KPI",
    items: [
      { label: "Đánh giá KPI", create: "Không tạo mới" },
      { label: "Quản lý mục tiêu", create: "Không tạo mới" }
    ]
  },
  {
    category: "CÔNG VIỆC",
    items: [
      { label: "Công việc", create: "Không tạo mới" },
      { label: "Timesheet", create: "Không tạo mới" }
    ]
  },
  {
    category: "ĐÁNH GIÁ",
    items: [{ label: "Đánh giá", create: "Không tạo mới" }]
  },
  {
    category: "KÝ SỐ",
    items: [
      { label: "Chữ ký số", create: "Không tạo mới" },
      { label: "Hồ sơ ký số", create: "Không tạo mới" }
    ]
  },
  {
    category: "BÁO CÁO",
    items: [
      { label: "Báo cáo", create: "Không tạo mới" },
      { label: "Dashboard", create: "Không tạo mới" }
    ]
  },
  {
    category: "KẾT NỐI",
    items: [
      { label: "Nhóm", create: "Không tạo mới" },
      { label: "Bài viết", create: "Không tạo mới" },
      { label: "Tường công ty" }
    ]
  },
  {
    category: "HỖ TRỢ",
    items: [{ label: "Ticket", create: "Không tạo mới" }]
  },
  {
    category: "ĐÀO TẠO",
    items: [{ label: "Đào tạo", create: "Không tạo mới" }]
  },
  {
    category: "TỰ ĐỘNG",
    items: [
      { label: "Tự động", create: "Không tạo mới" },
      { label: "Cảnh báo", create: "Không tạo mới" },
      { label: "Quy trình duyệt", create: "Không tạo mới" }
    ]
  },
  {
    category: "1ASSISTANT",
    items: [{ label: "Tri thức", create: "Không tạo mới" }]
  }
];

function ApiStatusBanner({ data }: { data: AccountAccessData }) {
  if (data.source === "api") {
    return null;
  }

  return (
    <section className="account-api-banner admin-user-api-banner" role="status">
      <strong>Chưa kết nối được Account API</strong>
      <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
    </section>
  );
}

function isAccountInGroup(account: ManagedUserAccount, group: PermissionGroup) {
  return account.groupId === group.id;
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "A";
}

function adminAvatar(accounts: ManagedUserAccount[]) {
  const admin = accounts.find((account) => account.role === "system_admin") ?? accounts[0];

  return admin ? initialsFromName(admin.name) : "A";
}

function activeAccountCount(group: PermissionGroup, accounts: ManagedUserAccount[]) {
  const activeAccounts = accounts
    .filter((account) => isAccountInGroup(account, group))
    .filter((account) => account.status === "active").length;

  return activeAccounts || group.memberCount;
}

function DetailPanel({
  children,
  className,
  title
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  const titleId = `group-detail-${title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "") || "panel"}`;

  return (
    <section className={className ? `admin-account-detail-panel ${className}` : "admin-account-detail-panel"} aria-labelledby={titleId}>
      <header className="admin-account-detail-panel-header">
        <h2 id={titleId}>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function FieldGrid({ fields }: { fields: DetailField[] }) {
  return (
    <dl className="admin-account-field-grid admin-group-detail-field-grid">
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PermissionCheckbox({ checked = true, label }: { checked?: boolean; label: string }) {
  return (
    <FormCheckbox
      checked={checked}
      className="admin-group-detail-permission-checkbox"
      disabled
      label={<span className="sr-only">{label}</span>}
      readOnly
    />
  );
}

function isPermissionItemSelected(item: GroupPermissionItem, allowedPermissionKeys: Set<string>) {
  return item.permissionKeys.some((permissionKey) => allowedPermissionKeys.has(permissionKey));
}

function PermissionTable({ data, group }: { data: AccountAccessData; group: PermissionGroup }) {
  const allowedPermissionKeys = new Set(group.permissionKeys);
  const permissionSections = filterGroupPermissionSectionsByCatalog(groupPermissionModuleSections, data.permissions)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isPermissionItemSelected(item, allowedPermissionKeys))
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="admin-account-permission-shell admin-group-detail-permission-shell" tabIndex={0} aria-label="Bảng chi tiết quyền nhóm có thể cuộn ngang">
      <table className="admin-account-permission-table admin-group-detail-permission-table">
        <thead>
          <tr>
            <th scope="col">Đối tượng</th>
            <th scope="col">Quản lý</th>
            <th scope="col">Xem</th>
            <th scope="col">Tạo mới</th>
          </tr>
        </thead>
        <tbody>
          {permissionSections.length === 0 ? (
            <tr>
              <td className="admin-group-detail-empty-permissions" colSpan={4}>Ch&#432;a c&#7845;p quy&#7873;n module</td>
            </tr>
          ) : null}
          {permissionSections.map((section) => (
            <Fragment key={section.category}>
              <tr className="is-category">
                <th scope="row">
                  <PermissionCheckbox checked={section.items.some((item) => isPermissionItemSelected(item, allowedPermissionKeys))} label={`Quyền ${section.category}`} />
                  <strong>{section.category}</strong>
                </th>
                <td>--</td>
                <td>--</td>
                <td>--</td>
              </tr>
              {section.items.map((item) => {
                const isChecked = isPermissionItemSelected(item, allowedPermissionKeys);
                const hasManageAction = hasGroupPermissionAction(item, allowedPermissionKeys, "manage");
                const hasViewAction = hasGroupPermissionAction(item, allowedPermissionKeys, "view");
                const hasCreateAction = hasGroupPermissionAction(item, allowedPermissionKeys, "create");

                return (
                  <tr key={`${section.category}-${item.label}`}>
                    <th scope="row">
                      <PermissionCheckbox checked={isChecked} label={item.label} />
                      <span>{item.label}</span>
                    </th>
                    <td>{isChecked && hasManageAction ? item.manage ?? "--" : "--"}</td>
                    <td>{isChecked && hasViewAction ? item.view ?? "--" : "--"}</td>
                    <td>{isChecked && hasCreateAction ? item.create ?? "--" : "--"}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildActivities(groupName: string): ActivityItem[] {
  return [
    {
      id: "group-edited-1",
      action: "đã sửa nhóm người dùng",
      time: "15:39 ngày 16/04/2026",
      tone: "orange",
      details: [`Tên nhóm: ${groupName}`, "Phân quyền: Chi tiết"]
    },
    {
      id: "group-edited-2",
      action: "đã sửa nhóm người dùng",
      time: "17:27 ngày 20/10/2025",
      tone: "orange",
      details: [`Tên nhóm: ${groupName}`, "Phân quyền: Chi tiết"]
    },
    {
      id: "group-edited-3",
      action: "đã sửa nhóm người dùng",
      time: "17:20 ngày 20/10/2025",
      tone: "orange",
      details: [`Tên nhóm: ${groupName}`, "Phân quyền: Chi tiết"]
    },
    {
      id: "group-edited-4",
      action: "đã sửa nhóm người dùng",
      time: "09:52 ngày 24/02/2024",
      tone: "orange",
      details: [`Tên nhóm: ${groupName}`, "Phân quyền: Chi tiết"]
    },
    {
      id: "group-created",
      action: "đã tạo mới",
      time: "09:20 ngày 23/02/2024",
      tone: "green",
      details: [`Tên nhóm: ${groupName}`, "Phân quyền: Chi tiết"]
    }
  ];
}

function ActivityTimeline({ activities, avatar }: { activities: ActivityItem[]; avatar: string }) {
  return (
    <div className="admin-account-activity-list admin-group-activity-list">
      {activities.map((activity) => (
        <article className="admin-account-activity-item admin-group-activity-item" key={activity.id}>
          <span className={`admin-account-activity-marker is-${activity.tone}`} aria-hidden="true">
            <MagicWand size={12} weight="duotone" />
          </span>
          <section>
            <header>
              <h3>
                <strong>Admin</strong> {activity.action}
                <ArrowSquareOut size={14} weight="duotone" aria-hidden="true" />
              </h3>
              <span className="admin-account-activity-avatar admin-group-activity-avatar" aria-hidden="true">
                {avatar}
              </span>
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
    </div>
  );
}

export function UserGroupDetailBoard({
  data,
  group
}: {
  data: AccountAccessData;
  group: PermissionGroup;
}) {
  const accountCount = activeAccountCount(group, data.accounts);
  const avatar = adminAvatar(data.accounts);
  const activities = buildActivities(group.name);
  const generalFields: DetailField[] = [
    { label: "Tên nhóm", value: group.name },
    { label: "Quản trị hệ thống", value: hasGroupSystemPermissions(group.permissionKeys) ? "Có" : "Không" },
    { label: "Nhóm mặc định", value: "Không" },
    { label: "Tài khoản hoạt động", value: accountCount }
  ];

  return (
    <main className="admin-group-detail-page" aria-label={`Chi tiết nhóm ${group.name}`}>
      <ApiStatusBanner data={data} />

      <section className="admin-group-detail-tabbar" aria-label="Điều hướng chi tiết nhóm">
        <nav className="admin-group-detail-tabs" aria-label="Tab chi tiết nhóm">
          <a className="is-active" href={`/admin/settings/accounts/groups/${encodeURIComponent(group.id)}`}>Chi tiết</a>
          <a href={`/admin/settings/accounts/groups/${encodeURIComponent(group.id)}?tab=accounts`}>
            Danh sách tài khoản ({accountCount})
          </a>
        </nav>

        <div className="admin-group-detail-actions" aria-label="Tác vụ nhóm">
          <a className="admin-account-action-button" href={`/admin/settings/accounts/groups/${encodeURIComponent(group.id)}/edit`}>
            <PencilSimple size={15} weight="duotone" aria-hidden="true" />
            Sửa
          </a>
          <button className="admin-account-action-button" type="button">
            <FileText size={15} weight="duotone" aria-hidden="true" />
            Nhân bản
          </button>
          <button className="admin-account-action-button" type="button">
            <FileClock size={15} weight="duotone" aria-hidden="true" />
            Lịch sử
          </button>
          <button className="admin-account-action-button is-disabled" type="button" disabled>
            <WarningCircle size={15} weight="duotone" aria-hidden="true" />
            HDSD
          </button>
          <button className="admin-account-action-button" type="button">
            <SlidersHorizontal size={15} weight="duotone" aria-hidden="true" />
            Tùy chỉnh
          </button>
        </div>
      </section>

      <div className="admin-group-detail-layout">
        <div className="admin-group-detail-main">
          <DetailPanel title="Thông tin chung">
            <FieldGrid fields={generalFields} />
          </DetailPanel>

          <DetailPanel title="Chi tiết quyền" className="admin-group-detail-permission-panel">
            <PermissionTable data={data} group={group} />
          </DetailPanel>
        </div>

        <aside className="admin-group-detail-side" aria-label="Thông tin bổ sung nhóm">
          <DetailPanel title="Lịch sử hoạt động" className="admin-account-activity-panel admin-group-activity-panel">
            <ActivityTimeline activities={activities} avatar={avatar} />
          </DetailPanel>
        </aside>
      </div>
    </main>
  );
}
