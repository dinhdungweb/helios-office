import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import {
  adminOperationEvents as fallbackOperationEvents,
  deviceAuthRequests as fallbackDeviceRequests
} from "@/lib/mock-data";

type FetchResult<T> = {
  error?: string;
  source: "api" | "unavailable";
  value: T | null;
};

type LeaveRequestRecord = {
  id: string;
  type?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  totalDays?: number | string;
  reason?: string | null;
  createdAt?: string;
  employee?: {
    code?: string;
    fullName?: string;
    department?: {
      name?: string;
    } | null;
  } | null;
};

type DeviceAuthRequestRecord = {
  id: string;
  employeeCode?: string;
  employeeName: string;
  department: string;
  deviceName: string;
  deviceId: string;
  status: "pending" | "approved" | "rejected" | "locked";
  submittedAt: string;
  note?: string | null;
};

type EmployeeRecord = {
  id: string;
  code: string;
  fullName?: string;
  title?: string;
  status?: string;
  startDate?: string;
  officialStartDate?: string | null;
  employeeType?: string | null;
  department?: {
    name?: string;
  } | string | null;
  contracts?: Array<{
    id: string;
    type: string;
    startDate: string;
    endDate?: string | null;
    status: string;
  }>;
};

type AttendanceSummary = {
  totalRecords: number;
  validRecords: number;
  recordsNeedReview: number;
};

type AccountSummary = {
  pendingActivation: number;
};

type AdminSettingsPayload = {
  overview: {
    needsReview: number;
    planned: number;
  };
  events: Array<{
    id: string;
    time: string;
    actor: string;
    action: string;
    target: string;
    severity: "info" | "warning" | "critical";
  }>;
};

export type AdminApprovalCategory = "approval" | "security" | "deadline" | "workflow" | "system";
export type AdminApprovalPriority = "normal" | "high" | "critical";
export type AdminApprovalStatus = "pending" | "assigned" | "approved" | "rejected" | "resolved";

export type AdminApprovalItem = {
  id: string;
  assignee: string;
  category: AdminApprovalCategory;
  createdAt: string;
  department: string;
  description: string;
  dueAt: string;
  href: string;
  priority: AdminApprovalPriority;
  requester: string;
  source: string;
  status: AdminApprovalStatus;
  title: string;
};

export type AdminAlertGroup = {
  category: AdminApprovalCategory;
  count: number;
  description: string;
  href: string;
  id: string;
  priority: AdminApprovalPriority;
  title: string;
};

export type AdminSystemNotification = {
  description: string;
  id: string;
  status: "info" | "warning" | "critical";
  time: string;
  title: string;
};

export type AdminApprovalAlertsData = {
  alerts: AdminAlertGroup[];
  errors: string[];
  generatedAt: string;
  items: AdminApprovalItem[];
  notifications: AdminSystemNotification[];
  source: "api" | "partial" | "unavailable";
  summary: {
    pendingApprovals: number;
    securityAlerts: number;
    deadlineAlerts: number;
    workflowAlerts: number;
    systemNotifications: number;
  };
};

async function requestJson<T>(path: string): Promise<T> {
  const headers = new Headers();
  const accessToken = await getSessionAccessToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function readData<T>(path: string): Promise<FetchResult<T>> {
  try {
    return {
      source: "api",
      value: await requestJson<T>(path)
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : `${path} unavailable`,
      source: "unavailable",
      value: null
    };
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Chưa xác định";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Chưa xác định";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getDepartmentName(employee: EmployeeRecord) {
  if (typeof employee.department === "string") {
    return employee.department;
  }

  return employee.department?.name ?? "Chưa gán phòng ban";
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return date;
}

function daysUntil(value?: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function buildApprovalRequests(leaveRequests: LeaveRequestRecord[]): AdminApprovalItem[] {
  return leaveRequests
    .filter((request) => request.status === "pending")
    .map((request) => ({
      id: `leave-${request.id}`,
      assignee: "Admin hệ thống",
      category: "approval",
      createdAt: formatDateTime(request.createdAt),
      department: request.employee?.department?.name ?? "Chưa rõ phòng ban",
      description: [
        request.reason ?? "Đơn từ đang chờ xử lý",
        request.fromDate && request.toDate ? `${formatDate(request.fromDate)} - ${formatDate(request.toDate)}` : null,
        request.totalDays ? `${request.totalDays} ngày` : null
      ]
        .filter(Boolean)
        .join(" · "),
      dueAt: formatDate(addDays(1).toISOString()),
      href: "/user?customMenu=user-board-requests",
      priority: "high",
      requester: request.employee?.fullName ?? request.employee?.code ?? "Nhân sự",
      source: "Đơn từ",
      status: "pending",
      title: request.type ?? "Đơn từ chờ duyệt"
    }));
}

function buildSecurityAlerts(deviceRequests: DeviceAuthRequestRecord[], accounts: AccountSummary | null): AdminApprovalItem[] {
  const deviceItems = deviceRequests
    .filter((request) => request.status === "pending")
    .map((request) => ({
      id: `device-${request.id}`,
      assignee: "IT Admin",
      category: "security" as const,
      createdAt: request.submittedAt,
      department: request.department,
      description: `${request.deviceName} · ${request.deviceId}`,
      dueAt: "Hôm nay",
      href: "/admin/settings/accounts/device-auth",
      priority: "critical" as const,
      requester: request.employeeName,
      source: "Xác thực thiết bị",
      status: "pending" as const,
      title: "Thiết bị mới chờ xác thực"
    }));

  if ((accounts?.pendingActivation ?? 0) === 0) {
    return deviceItems;
  }

  return [
    ...deviceItems,
    {
      id: "account-pending-activation",
      assignee: "System Admin",
      category: "security",
      createdAt: "Hôm nay",
      department: "Toàn hệ thống",
      description: `${accounts?.pendingActivation ?? 0} tài khoản đã cấp nhưng chưa kích hoạt đăng nhập.`,
      dueAt: "Hôm nay",
      href: "/admin/settings/accounts",
      priority: "high",
      requester: "Hệ thống",
      source: "Tài khoản",
      status: "assigned",
      title: "Tài khoản chưa kích hoạt"
    }
  ];
}

function buildDeadlineAlerts(employees: EmployeeRecord[]): AdminApprovalItem[] {
  const contractItems = employees.flatMap((employee) =>
    (employee.contracts ?? [])
      .filter((contract) => {
        const remainingDays = daysUntil(contract.endDate);

        return contract.status !== "ended" && remainingDays >= 0 && remainingDays <= 45;
      })
      .map((contract) => ({
        id: `contract-${contract.id}`,
        assignee: "HCNS",
        category: "deadline" as const,
        createdAt: "Tự động",
        department: getDepartmentName(employee),
        description: `${contract.type} · ${employee.title ?? "Chưa có chức danh"}`,
        dueAt: formatDate(contract.endDate),
        href: `/admin/hr/employees`,
        priority: daysUntil(contract.endDate) <= 15 ? "critical" as const : "high" as const,
        requester: employee.fullName ?? employee.code,
        source: "Hợp đồng",
        status: "pending" as const,
        title: "Hợp đồng sắp hết hạn"
      }))
  );

  const probationItems = employees
    .filter((employee) => {
      const isProbation = employee.employeeType?.toLowerCase().includes("thử") || employee.status === "onboarding";
      const remainingDays = daysUntil(employee.officialStartDate);

      return isProbation && remainingDays >= 0 && remainingDays <= 30;
    })
    .map((employee) => ({
      id: `probation-${employee.id}`,
      assignee: "HCNS",
      category: "deadline" as const,
      createdAt: "Tự động",
      department: getDepartmentName(employee),
      description: `${employee.title ?? "Nhân sự"} · cần đánh giá thử việc trước khi chính thức.`,
      dueAt: formatDate(employee.officialStartDate),
      href: "/admin/hr/employees",
      priority: "high" as const,
      requester: employee.fullName ?? employee.code,
      source: "Thử việc",
      status: "pending" as const,
      title: "Hết hạn thử việc"
    }));

  return [...contractItems, ...probationItems].slice(0, 8);
}

function buildWorkflowAlerts(
  attendance: AttendanceSummary | null,
  settings: AdminSettingsPayload | null
): AdminApprovalItem[] {
  const items: AdminApprovalItem[] = [];

  if ((attendance?.recordsNeedReview ?? 0) > 0) {
    items.push({
      id: "attendance-review",
      assignee: "HR Ops",
      category: "workflow",
      createdAt: "Hôm nay",
      department: "Toàn công ty",
      description: `${attendance?.recordsNeedReview ?? 0} bản ghi công cần rà soát trước khi khóa bảng công.`,
      dueAt: "Hôm nay",
      href: "/user?customMenu=user-board-attendance",
      priority: "high",
      requester: "Hệ thống chấm công",
      source: "Chấm công",
      status: "assigned",
      title: "Dữ liệu công cần xử lý"
    });
  }

  if ((settings?.overview.needsReview ?? 0) > 0) {
    items.push({
      id: "settings-review",
      assignee: "System Admin",
      category: "workflow",
      createdAt: "Hôm nay",
      department: "Hệ thống",
      description: `${settings?.overview.needsReview ?? 0} cấu hình đang ở trạng thái cần rà soát.`,
      dueAt: "Tuần này",
      href: "/admin/settings",
      priority: "normal",
      requester: "Hệ thống",
      source: "Cấu hình",
      status: "assigned",
      title: "Cấu hình cần rà soát"
    });
  }

  return items;
}

function buildSystemNotifications(settings: AdminSettingsPayload | null): AdminSystemNotification[] {
  const eventNotifications: AdminSystemNotification[] =
    settings?.events.slice(0, 4).map((event) => ({
      id: `event-${event.id}`,
      description: `${event.actor} · ${event.target}`,
      status: event.severity,
      time: event.time,
      title: event.action
    })) ?? fallbackOperationEvents.map((event) => ({
      id: `event-${event.id}`,
      description: `${event.actor} · ${event.target}`,
      status: event.severity as AdminSystemNotification["status"],
      time: event.time,
      title: event.action
    }));
  const releaseNote: AdminSystemNotification = {
    id: "release-note",
    description: "Bổ sung trung tâm phê duyệt và cảnh báo cho tài khoản Admin.",
    status: "info",
    time: "Hôm nay",
    title: "Cập nhật phiên bản"
  };

  return [...eventNotifications, releaseNote].slice(0, 5);
}

function buildAlertGroups(items: AdminApprovalItem[], notifications: AdminSystemNotification[]): AdminAlertGroup[] {
  const countByCategory = (category: AdminApprovalCategory) => items.filter((item) => item.category === category).length;

  return [
    {
      id: "approval-requests",
      category: "approval",
      count: countByCategory("approval"),
      description: "Đơn hành chính, nhân sự và tài chính đang chờ Admin xử lý.",
      href: "#approval-table",
      priority: "high",
      title: "Phê duyệt đơn từ"
    },
    {
      id: "security-alerts",
      category: "security",
      count: countByCategory("security"),
      description: "Thiết bị mới, tài khoản chưa kích hoạt và cảnh báo quyền hạn.",
      href: "#approval-table",
      priority: "critical",
      title: "Bảo mật & tài khoản"
    },
    {
      id: "deadline-alerts",
      category: "deadline",
      count: countByCategory("deadline"),
      description: "Hợp đồng, thử việc và thời hạn hệ thống cần theo dõi.",
      href: "#approval-table",
      priority: "high",
      title: "Vận hành & thời hạn"
    },
    {
      id: "workflow-alerts",
      category: "workflow",
      count: countByCategory("workflow"),
      description: "Dữ liệu công, cấu hình và các điểm nghẽn quy trình.",
      href: "#approval-table",
      priority: "normal",
      title: "Công việc & quy trình"
    },
    {
      id: "system-notifications",
      category: "system",
      count: notifications.length,
      description: "Cập nhật hệ thống, lỗi đồng bộ và thông báo vận hành.",
      href: "#system-notifications",
      priority: "normal",
      title: "Thông báo hệ thống"
    }
  ];
}

export async function getAdminApprovalAlertsData(): Promise<AdminApprovalAlertsData> {
  const [leaveResult, deviceResult, employeeResult, attendanceResult, accountResult, settingsResult] = await Promise.all([
    readData<LeaveRequestRecord[]>("/leave-requests"),
    readData<DeviceAuthRequestRecord[]>("/device-auth/requests"),
    readData<EmployeeRecord[]>("/employees"),
    readData<AttendanceSummary>("/attendance/summary"),
    readData<AccountSummary>("/account-access/summary"),
    readData<AdminSettingsPayload>("/admin-settings")
  ]);

  const leaveRequests = leaveResult.value ?? [];
  const deviceRequests = deviceResult.value ?? fallbackDeviceRequests;
  const employees = employeeResult.value ?? [];
  const attendance = attendanceResult.value;
  const settings = settingsResult.value;
  const accounts = accountResult.value;
  const items = [
    ...buildApprovalRequests(leaveRequests),
    ...buildSecurityAlerts(deviceRequests, accounts),
    ...buildDeadlineAlerts(employees),
    ...buildWorkflowAlerts(attendance, settings)
  ];
  const notifications = buildSystemNotifications(settings);
  const alerts = buildAlertGroups(items, notifications);
  const errors = [leaveResult, deviceResult, employeeResult, attendanceResult, accountResult, settingsResult]
    .filter((result) => result.source === "unavailable" && result.error)
    .map((result) => result.error as string);

  return {
    alerts,
    errors,
    generatedAt: new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date()),
    items,
    notifications,
    source: errors.length === 0 ? "api" : errors.length >= 5 ? "unavailable" : "partial",
    summary: {
      pendingApprovals: items.filter((item) => item.category === "approval" && item.status === "pending").length,
      securityAlerts: items.filter((item) => item.category === "security").length,
      deadlineAlerts: items.filter((item) => item.category === "deadline").length,
      workflowAlerts: items.filter((item) => item.category === "workflow").length,
      systemNotifications: notifications.length
    }
  };
}
