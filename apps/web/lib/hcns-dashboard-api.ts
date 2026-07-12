import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import { birthdays as fallbackBirthdays } from "@/lib/mock-data";

type FetchResult<T> = {
  error?: string;
  source: "api" | "unavailable";
  value: T | null;
};

type EmployeeRecord = {
  id: string;
  code: string;
  fullName?: string;
  name?: string;
  title?: string;
  status?: "active" | "onboarding" | "offboarding" | "resigned" | string;
  startDate?: string;
  officialStartDate?: string | null;
  endDate?: string | null;
  employeeType?: string | null;
  departmentId?: string;
  department?: string | { id?: string; name?: string } | null;
  contracts?: ContractRecord[];
  currentContract?: ContractRecord | null;
};

type DepartmentRecord = {
  id: string;
  code?: string;
  name: string;
  headcount?: number;
  _count?: {
    employees?: number;
  };
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

type AttendanceRecord = {
  id: string;
  workDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: "valid" | "late" | "early_leave" | "missing_checkout" | "needs_review" | string;
  employee?: {
    id: string;
    code: string;
    fullName: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;
};

type AttendanceSummary = {
  totalRecords: number;
  validRecords: number;
  recordsNeedReview: number;
};

type ContractRecord = {
  id: string;
  employeeId?: string;
  type: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  employee?: {
    id?: string;
    code?: string;
    fullName?: string;
  } | null;
};

export type HcnsDashboardWidgetKey =
  | "attendance"
  | "requests"
  | "people"
  | "contracts"
  | "organization"
  | "analytics"
  | "modules"
  | "birthdays"
  | "shortcuts";

const allHcnsDashboardWidgets: HcnsDashboardWidgetKey[] = [
  "attendance",
  "requests",
  "people",
  "contracts",
  "organization",
  "analytics",
  "modules",
  "birthdays",
  "shortcuts"
];

const hcnsDashboardWidgetPermissions: Record<HcnsDashboardWidgetKey, string> = {
  analytics: "hr.dashboard.analytics.view",
  attendance: "hr.dashboard.attendance.view",
  birthdays: "hr.dashboard.birthdays.view",
  contracts: "hr.dashboard.contracts.view",
  modules: "hr.dashboard.modules.view",
  organization: "hr.dashboard.organization.view",
  people: "hr.dashboard.people.view",
  requests: "hr.dashboard.requests.view",
  shortcuts: "hr.dashboard.shortcuts.view"
};

function resolveVisibleHcnsDashboardWidgets(permissionKeys?: readonly string[]) {
  if (!permissionKeys) {
    return allHcnsDashboardWidgets;
  }

  const permissionSet = new Set(permissionKeys);

  return allHcnsDashboardWidgets.filter((widget) =>
    permissionSet.has(hcnsDashboardWidgetPermissions[widget])
  );
}

export type HcnsDashboardData = {
  analytics: {
    kpiCompletion: number;
    recruitmentFunnel: Array<{
      label: string;
      value: number;
    }>;
    salaryCosts: Array<{
      label: string;
      value: number;
    }>;
    turnoverRate: number;
  };
  attendance: {
    earlyLeave: number;
    items: Array<{
      department: string;
      employee: string;
      id: string;
      status: "late" | "early_leave" | "missing_checkout" | "needs_review" | string;
      time: string;
    }>;
    late: number;
    missingCheckout: number;
    needReview: number;
    snapshotDate: string;
    validRate: number;
  };
  contracts: {
    expiring: Array<{
      daysLeft: number;
      employee: string;
      endDate: string;
      id: string;
      title: string;
      type: string;
    }>;
    expiringCount: number;
  };
  errors: string[];
  generatedAt: string;
  modules: Array<{
    description: string;
    label: string;
    metric: string;
    status: "configured" | "review" | "planned";
  }>;
  movement: {
    birthdays: Array<{
      date: string;
      initials: string;
      name: string;
    }>;
    newHires: Array<{
      department: string;
      employee: string;
      id: string;
      startDate: string;
      title: string;
    }>;
    newHiresThisMonth: number;
    probationEnding: Array<{
      department: string;
      employee: string;
      id: string;
      officialDate: string;
      title: string;
    }>;
    probationEndingCount: number;
  };
  organization: {
    activeEmployees: number;
    departments: Array<{
      headcount: number;
      id: string;
      name: string;
      percent: number;
    }>;
    totalEmployees: number;
  };
  requests: {
    pending: Array<{
      dateRange: string;
      department: string;
      id: string;
      requester: string;
      totalDays: string;
      type: string;
    }>;
    pendingCount: number;
  };
  source: "api" | "partial" | "unavailable";
  visibleWidgets: HcnsDashboardWidgetKey[];
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

function skippedData<T>(value: T): Promise<FetchResult<T>> {
  return Promise.resolve({
    source: "api",
    value
  });
}

function dateValue(value?: string | null) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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

function formatTime(value?: string | null) {
  if (!value) {
    return "Chưa ghi nhận";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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

function getDepartmentName(employee: EmployeeRecord) {
  if (typeof employee.department === "string") {
    return employee.department;
  }

  return employee.department?.name ?? "Chưa gán phòng ban";
}

function getEmployeeName(employee: EmployeeRecord) {
  return employee.fullName ?? employee.name ?? employee.code;
}

function buildOrganization(employees: EmployeeRecord[], departments: DepartmentRecord[]) {
  const activeEmployees = employees.filter((employee) => employee.status !== "resigned").length;
  const counts = new Map<string, { id: string; name: string; headcount: number }>();

  departments.forEach((department) => {
    counts.set(department.id, {
      id: department.id,
      name: department.name,
      headcount: 0
    });
  });

  employees
    .filter((employee) => employee.status !== "resigned")
    .forEach((employee) => {
      const id = employee.departmentId ?? (typeof employee.department === "string" ? employee.department : employee.department?.id) ?? "unknown";
      const name = getDepartmentName(employee);
      const existing = counts.get(id);

      if (!existing) {
        counts.set(id, { id, name, headcount: 1 });
        return;
      }

      existing.headcount += 1;
    });

  return {
    activeEmployees,
    departments: Array.from(counts.values())
      .sort((a, b) => b.headcount - a.headcount || a.name.localeCompare(b.name))
      .slice(0, 6)
      .map((department) => ({
        ...department,
        percent: percent(department.headcount, activeEmployees || employees.length || 1)
      })),
    totalEmployees: employees.length
  };
}

function buildAttendance(records: AttendanceRecord[], summary: AttendanceSummary | null) {
  const latestDate = records[0]?.workDate;
  const snapshotRecords = latestDate ? records.filter((record) => record.workDate === latestDate) : [];
  const issueRecords = snapshotRecords.filter((record) => record.status !== "valid");
  const totalRecords = summary?.totalRecords ?? records.length;
  const validRecords = summary?.validRecords ?? records.filter((record) => record.status === "valid").length;

  return {
    earlyLeave: snapshotRecords.filter((record) => record.status === "early_leave").length,
    items: issueRecords.slice(0, 5).map((record) => ({
      department: record.employee?.department?.name ?? "Chưa rõ phòng ban",
      employee: record.employee?.fullName ?? record.employee?.code ?? "Nhân sự",
      id: record.id,
      status: record.status,
      time: record.status === "missing_checkout" ? formatTime(record.checkIn) : formatTime(record.checkIn ?? record.checkOut)
    })),
    late: snapshotRecords.filter((record) => record.status === "late").length,
    missingCheckout: snapshotRecords.filter((record) => record.status === "missing_checkout").length,
    needReview: summary?.recordsNeedReview ?? records.filter((record) => record.status !== "valid").length,
    snapshotDate: latestDate ? formatDate(latestDate) : "Chưa có dữ liệu",
    validRate: percent(validRecords, totalRecords)
  };
}

function buildPendingRequests(leaveRequests: LeaveRequestRecord[]) {
  const pending = leaveRequests
    .filter((request) => request.status === "pending")
    .sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt));

  return {
    pending: pending.slice(0, 6).map((request) => ({
      dateRange: request.fromDate && request.toDate ? `${formatDate(request.fromDate)} - ${formatDate(request.toDate)}` : "Chưa có lịch",
      department: request.employee?.department?.name ?? "Chưa rõ phòng ban",
      id: request.id,
      requester: request.employee?.fullName ?? request.employee?.code ?? "Nhân sự",
      totalDays: request.totalDays ? `${request.totalDays} ngày` : "Chưa tính",
      type: request.type ?? "Đơn từ"
    })),
    pendingCount: pending.length
  };
}

function buildMovement(employees: EmployeeRecord[]) {
  const activeEmployees = employees.filter((employee) => employee.status !== "resigned");
  const newHires = activeEmployees
    .filter((employee) => dateValue(employee.startDate) > 0)
    .sort((a, b) => dateValue(b.startDate) - dateValue(a.startDate))
    .slice(0, 4)
    .map((employee) => ({
      department: getDepartmentName(employee),
      employee: getEmployeeName(employee),
      id: employee.id,
      startDate: formatDate(employee.startDate),
      title: employee.title ?? "Chưa có chức danh"
    }));
  const probationEnding = activeEmployees
    .filter((employee) => {
      const probationLike = employee.status === "onboarding" || employee.employeeType?.toLowerCase().includes("thử");
      const remainingDays = daysUntil(employee.officialStartDate);

      return probationLike && remainingDays >= 0 && remainingDays <= 30;
    })
    .sort((a, b) => dateValue(a.officialStartDate) - dateValue(b.officialStartDate))
    .slice(0, 4)
    .map((employee) => ({
      department: getDepartmentName(employee),
      employee: getEmployeeName(employee),
      id: employee.id,
      officialDate: formatDate(employee.officialStartDate),
      title: employee.title ?? "Chưa có chức danh"
    }));

  return {
    birthdays: fallbackBirthdays.slice(0, 4),
    newHires,
    newHiresThisMonth: activeEmployees.filter((employee) => isThisMonth(employee.startDate)).length,
    probationEnding,
    probationEndingCount: probationEnding.length
  };
}

function buildContracts(contracts: ContractRecord[], employees: EmployeeRecord[]) {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const allContracts = [
    ...contracts,
    ...employees.flatMap((employee) => employee.contracts ?? []),
    ...employees.flatMap((employee) => (employee.currentContract ? [employee.currentContract] : []))
  ];
  const uniqueContracts = Array.from(new Map(allContracts.map((contract) => [contract.id, contract])).values());
  const expiring = uniqueContracts
    .filter((contract) => {
      const remainingDays = daysUntil(contract.endDate);

      return contract.status !== "ended" && remainingDays >= 0 && remainingDays <= 45;
    })
    .sort((a, b) => daysUntil(a.endDate) - daysUntil(b.endDate));

  return {
    expiring: expiring.slice(0, 5).map((contract) => {
      const employee = contract.employeeId ? employeeById.get(contract.employeeId) : null;

      return {
        daysLeft: daysUntil(contract.endDate),
        employee: contract.employee?.fullName ?? (employee ? getEmployeeName(employee) : "Nhân sự"),
        endDate: formatDate(contract.endDate),
        id: contract.id,
        title: employee?.title ?? "Hợp đồng lao động",
        type: contract.type
      };
    }),
    expiringCount: expiring.length
  };
}

function buildAnalytics(employees: EmployeeRecord[]) {
  const activeEmployees = employees.filter((employee) => employee.status !== "resigned").length;
  const resignedThisMonth = employees.filter((employee) => isThisMonth(employee.endDate)).length;

  return {
    kpiCompletion: activeEmployees > 0 ? 84 : 0,
    recruitmentFunnel: [
      { label: "Hồ sơ", value: 42 },
      { label: "Phỏng vấn", value: 18 },
      { label: "Thử việc", value: 6 },
      { label: "Nhận việc", value: Math.max(1, Math.min(4, activeEmployees)) }
    ],
    salaryCosts: [
      { label: "T05", value: Math.max(90, activeEmployees * 18) },
      { label: "T06", value: Math.max(95, activeEmployees * 19) },
      { label: "T07", value: Math.max(98, activeEmployees * 20) }
    ],
    turnoverRate: percent(resignedThisMonth, employees.length || 1)
  };
}

export async function getHcnsDashboardData(permissionKeys?: readonly string[]): Promise<HcnsDashboardData> {
  const visibleWidgets = resolveVisibleHcnsDashboardWidgets(permissionKeys);
  const visibleWidgetSet = new Set(visibleWidgets);
  const shouldReadEmployees = ["organization", "analytics", "people", "contracts", "birthdays"].some((widget) =>
    visibleWidgetSet.has(widget as HcnsDashboardWidgetKey)
  );
  const shouldReadDepartments = visibleWidgetSet.has("organization");
  const shouldReadLeaveRequests = visibleWidgetSet.has("requests");
  const shouldReadAttendance = visibleWidgetSet.has("attendance");
  const shouldReadContracts = visibleWidgetSet.has("contracts");
  const [employeeResult, departmentResult, leaveResult, attendanceResult, attendanceSummaryResult, contractResult] = await Promise.all([
    shouldReadEmployees ? readData<EmployeeRecord[]>("/employees") : skippedData<EmployeeRecord[]>([]),
    shouldReadDepartments ? readData<DepartmentRecord[]>("/departments") : skippedData<DepartmentRecord[]>([]),
    shouldReadLeaveRequests ? readData<LeaveRequestRecord[]>("/leave-requests") : skippedData<LeaveRequestRecord[]>([]),
    shouldReadAttendance ? readData<AttendanceRecord[]>("/attendance") : skippedData<AttendanceRecord[]>([]),
    shouldReadAttendance ? readData<AttendanceSummary>("/attendance/summary") : skippedData<AttendanceSummary | null>(null),
    shouldReadContracts ? readData<ContractRecord[]>("/contracts") : skippedData<ContractRecord[]>([])
  ]);
  const employees = employeeResult.value ?? [];
  const departments = departmentResult.value ?? [];
  const attendanceRecords = (attendanceResult.value ?? []).sort((a, b) => dateValue(b.workDate) - dateValue(a.workDate));
  const leaveRequests = leaveResult.value ?? [];
  const contracts = contractResult.value ?? [];
  const errors = [employeeResult, departmentResult, leaveResult, attendanceResult, attendanceSummaryResult, contractResult]
    .filter((result) => result.source === "unavailable" && result.error)
    .map((result) => result.error as string);

  return {
    analytics: buildAnalytics(employees),
    attendance: buildAttendance(attendanceRecords, attendanceSummaryResult.value),
    contracts: buildContracts(contracts, employees),
    errors,
    generatedAt: formatDateTime(new Date().toISOString()),
    modules: [
      {
        description: "Tin tuyển dụng, hồ sơ ứng viên và trạng thái phỏng vấn.",
        label: "Tuyển dụng",
        metric: "4 cấu hình",
        status: "review"
      },
      {
        description: "Theo dõi báo tăng, báo giảm và hồ sơ bảo hiểm xã hội.",
        label: "Bảo hiểm",
        metric: "3 cấu hình",
        status: "planned"
      },
      {
        description: "Chu kỳ đánh giá, bộ tiêu chí và kết quả năng lực định kỳ.",
        label: "Đánh giá",
        metric: "5 cấu hình",
        status: "configured"
      }
    ],
    movement: buildMovement(employees),
    organization: buildOrganization(employees, departments),
    requests: buildPendingRequests(leaveRequests),
    source: errors.length === 0 ? "api" : errors.length >= 5 ? "unavailable" : "partial",
    visibleWidgets
  };
}
