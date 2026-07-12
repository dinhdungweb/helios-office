import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import { announcements as fallbackAnnouncements, birthdays as fallbackBirthdays } from "@/lib/mock-data";

type AccountSummary = {
  totalAccounts: number;
  activeAccounts: number;
  pendingActivation: number;
  closedAccounts: number;
  systemAdmins: number;
  customizedAccounts: number;
};

type EmployeeRecord = {
  id: string;
  code: string;
  fullName?: string;
  name?: string;
  status?: "active" | "onboarding" | "offboarding" | "resigned";
  startDate?: string;
  endDate?: string | null;
  departmentId?: string;
  department?: string;
  accountId?: string | null;
};

type DepartmentRecord = {
  id: string;
  name: string;
  headcount?: number;
};

type LeaveRequestRecord = {
  id: string;
  type?: string;
  status?: string;
  createdAt?: string;
  employee?: {
    fullName?: string;
    code?: string;
    department?: {
      name?: string;
    };
  };
};

type AttendanceSummary = {
  totalRecords: number;
  validRecords: number;
  recordsNeedReview: number;
};

type DeviceAuthRequest = {
  id: string;
  employeeName: string;
  department: string;
  deviceName: string;
  status: "pending" | "approved" | "rejected" | "locked";
  submittedAt: string;
};

type AdminSettingsPayload = {
  overview: {
    configured: number;
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

type AnnouncementRecord = {
  id: string;
  title: string;
  time: string;
  audience: string;
  readRate: number;
};

type DashboardFetchResult<T> = {
  value: T | null;
  source: "api" | "unavailable";
  error?: string;
};

export type AdminDashboardData = {
  source: "api" | "partial" | "unavailable";
  generatedAt: string;
  system: {
    totalEmployees: number;
    activeEmployees: number;
    activeAccounts: number;
    totalAccounts: number;
    accountUsagePercent: number;
    storageUsedGb: number;
    storageLimitGb: number;
    storageUsagePercent: number;
    remainingDays: number;
    expiryDate: string;
  };
  approvals: {
    pendingRequests: number;
    overdueTasks: number;
    securityAlerts: number;
    devicePending: number;
    attendanceNeedReview: number;
    items: Array<{
      id: string;
      title: string;
      description: string;
      tone: "info" | "warning" | "critical";
      href: string;
    }>;
  };
  hrm: {
    newEmployeesThisMonth: number;
    resignedThisMonth: number;
    attendanceRate: number;
    departments: Array<{
      id: string;
      name: string;
      headcount: number;
      percent: number;
    }>;
    monthlyMovement: Array<{
      month: string;
      joined: number;
      resigned: number;
    }>;
  };
  internal: {
    announcements: AnnouncementRecord[];
    birthdays: Array<{
      name: string;
      initials: string;
      date: string;
    }>;
    averageReadRate: number;
    interactions: {
      likes: number;
      comments: number;
      posts: number;
    };
  };
  operations: {
    settingsConfigured: number;
    settingsNeedReview: number;
    settingsPlanned: number;
    events: AdminSettingsPayload["events"];
  };
  errors: string[];
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

async function readData<T>(path: string): Promise<DashboardFetchResult<T>> {
  try {
    return {
      value: await requestJson<T>(path),
      source: "api"
    };
  } catch (error) {
    return {
      value: null,
      source: "unavailable",
      error: error instanceof Error ? error.message : `${path} unavailable`
    };
  }
}

function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function isThisMonth(value?: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function buildDepartmentBreakdown(employees: EmployeeRecord[], departments: DepartmentRecord[]) {
  const counts = new Map<string, { id: string; name: string; headcount: number }>();

  departments.forEach((department) => {
    counts.set(department.id, {
      id: department.id,
      name: department.name,
      headcount: department.headcount ?? 0
    });
  });

  employees.forEach((employee) => {
    const key = employee.departmentId ?? employee.department ?? "unknown";
    const existing = counts.get(key);

    if (existing) {
      existing.headcount = Math.max(existing.headcount, 0);
      return;
    }

    counts.set(key, {
      id: key,
      name: employee.department ?? "Chưa gán phòng ban",
      headcount: 1
    });
  });

  const total = employees.length || Array.from(counts.values()).reduce((sum, item) => sum + item.headcount, 0);

  return Array.from(counts.values())
    .sort((a, b) => b.headcount - a.headcount || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((department) => ({
      ...department,
      percent: percent(department.headcount, total)
    }));
}

function buildMonthlyMovement(employees: EmployeeRecord[]) {
  const formatter = new Intl.DateTimeFormat("vi-VN", { month: "2-digit" });
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const month = `${formatter.format(date)}/${date.getFullYear()}`;
    const joined = employees.filter((employee) => {
      if (!employee.startDate) {
        return false;
      }

      const startedAt = new Date(employee.startDate);
      return startedAt.getFullYear() === date.getFullYear() && startedAt.getMonth() === date.getMonth();
    }).length;
    const resigned = employees.filter((employee) => {
      if (!employee.endDate) {
        return false;
      }

      const endedAt = new Date(employee.endDate);
      return endedAt.getFullYear() === date.getFullYear() && endedAt.getMonth() === date.getMonth();
    }).length;

    return { month, joined, resigned };
  });
}

function buildApprovalItems(
  leaveRequests: LeaveRequestRecord[],
  devices: DeviceAuthRequest[],
  attendanceSummary: AttendanceSummary | null
) {
  const pendingLeaves = leaveRequests.filter((request) => request.status === "pending");
  const pendingDevices = devices.filter((request) => request.status === "pending");
  const items = [
    ...pendingLeaves.slice(0, 2).map((request) => ({
      id: request.id,
      title: request.type ?? "Đơn từ chờ duyệt",
      description: `${request.employee?.fullName ?? request.employee?.code ?? "Nhân sự"} · ${request.employee?.department?.name ?? "Chưa rõ phòng ban"}`,
      tone: "warning" as const,
      href: "/admin/approvals-alerts"
    })),
    ...pendingDevices.slice(0, 2).map((request) => ({
      id: request.id,
      title: "Thiết bị chờ xác thực",
      description: `${request.employeeName} · ${request.deviceName}`,
      tone: "critical" as const,
      href: "/admin/settings/accounts/device-auth"
    }))
  ];

  if (attendanceSummary?.recordsNeedReview) {
    items.push({
      id: "attendance-review",
      title: "Dữ liệu công cần rà soát",
      description: `${attendanceSummary.recordsNeedReview} bản ghi chưa hợp lệ`,
      tone: "warning",
      href: "/admin/approvals-alerts"
    });
  }

  return items;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    accountResult,
    employeeResult,
    departmentResult,
    leaveResult,
    attendanceResult,
    deviceResult,
    settingsResult,
    announcementResult
  ] = await Promise.all([
    readData<AccountSummary>("/account-access/summary"),
    readData<EmployeeRecord[]>("/employees"),
    readData<DepartmentRecord[]>("/departments"),
    readData<LeaveRequestRecord[]>("/leave-requests"),
    readData<AttendanceSummary>("/attendance/summary"),
    readData<DeviceAuthRequest[]>("/device-auth/requests"),
    readData<AdminSettingsPayload>("/admin-settings"),
    readData<AnnouncementRecord[]>("/announcements")
  ]);
  const employees = employeeResult.value ?? [];
  const departments = departmentResult.value ?? [];
  const accounts = accountResult.value ?? {
    totalAccounts: 0,
    activeAccounts: 0,
    pendingActivation: 0,
    closedAccounts: 0,
    systemAdmins: 0,
    customizedAccounts: 0
  };
  const leaveRequests = leaveResult.value ?? [];
  const attendanceSummary = attendanceResult.value;
  const deviceRequests = deviceResult.value ?? [];
  const settings = settingsResult.value;
  const announcements = announcementResult.value ?? fallbackAnnouncements;
  const errors = [
    accountResult,
    employeeResult,
    departmentResult,
    leaveResult,
    attendanceResult,
    deviceResult,
    settingsResult,
    announcementResult
  ]
    .filter((result) => result.source === "unavailable" && result.error)
    .map((result) => result.error as string);
  const activeEmployees = employees.filter((employee) => employee.status === "active").length;
  const storageLimitGb = 100;
  const storageUsedGb = Math.max(18, Math.round((accounts.totalAccounts + employees.length * 3.7) * 10) / 10);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 118);
  const pendingRequests = leaveRequests.filter((request) => request.status === "pending").length;
  const devicePending = deviceRequests.filter((request) => request.status === "pending").length;
  const attendanceNeedReview = attendanceSummary?.recordsNeedReview ?? 0;
  const validRecords = attendanceSummary?.validRecords ?? 0;
  const totalRecords = attendanceSummary?.totalRecords ?? 0;

  return {
    source: errors.length === 0 ? "api" : errors.length >= 6 ? "unavailable" : "partial",
    generatedAt: new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date()),
    system: {
      totalEmployees: employees.length,
      activeEmployees,
      activeAccounts: accounts.activeAccounts,
      totalAccounts: accounts.totalAccounts,
      accountUsagePercent: percent(accounts.activeAccounts, accounts.totalAccounts || employees.length || 1),
      storageUsedGb,
      storageLimitGb,
      storageUsagePercent: percent(storageUsedGb, storageLimitGb),
      remainingDays: 118,
      expiryDate: new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(expiryDate)
    },
    approvals: {
      pendingRequests,
      overdueTasks: settings?.overview.needsReview ?? 0,
      securityAlerts: devicePending + accounts.pendingActivation,
      devicePending,
      attendanceNeedReview,
      items: buildApprovalItems(leaveRequests, deviceRequests, attendanceSummary)
    },
    hrm: {
      newEmployeesThisMonth: employees.filter((employee) => isThisMonth(employee.startDate)).length,
      resignedThisMonth: employees.filter((employee) => isThisMonth(employee.endDate)).length,
      attendanceRate: totalRecords > 0 ? percent(validRecords, totalRecords) : 0,
      departments: buildDepartmentBreakdown(employees, departments),
      monthlyMovement: buildMonthlyMovement(employees)
    },
    internal: {
      announcements: announcements.slice(0, 3),
      birthdays: fallbackBirthdays.slice(0, 3),
      averageReadRate: announcements.length
        ? Math.round(announcements.reduce((sum, announcement) => sum + announcement.readRate, 0) / announcements.length)
        : 0,
      interactions: {
        likes: 128,
        comments: 34,
        posts: announcements.length
      }
    },
    operations: {
      settingsConfigured: settings?.overview.configured ?? 0,
      settingsNeedReview: settings?.overview.needsReview ?? 0,
      settingsPlanned: settings?.overview.planned ?? 0,
      events: settings?.events.slice(0, 6) ?? []
    },
    errors
  };
}
