import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type EmployeeDirectoryStatus = "active" | "onboarding" | "offboarding" | "resigned";

export type EmployeeDirectoryRecord = {
  id: string;
  code: string;
  name: string;
  fullName: string;
  title: string;
  status: EmployeeDirectoryStatus;
  startDate: string;
  officialStartDate?: string | null;
  endDate?: string | null;
  employeeType?: string | null;
  avatarUrl?: string | null;
  attendanceCode?: string | null;
  attendanceMode?: string | null;
  payrollTemplate?: string | null;
  standardWorkdays?: number | null;
  departmentId: string;
  department: string;
  departmentCode?: string | null;
  positionId?: string | null;
  positionName?: string | null;
  jobTitleId?: string | null;
  jobTitleName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  managerCode?: string | null;
  accountId?: string | null;
  accountEmail?: string | null;
  accountStatus?: "pending_activation" | "active" | "closed" | null;
  accountDisplayName?: string | null;
  accountRole?: "system_admin" | "user" | null;
  permissionGroupId?: string | null;
};

export type EmployeeDirectoryOption = {
  id: string;
  code?: string;
  name: string;
  description?: string;
  employeeId?: string | null;
  status?: string | null;
};

export type EmployeeDirectoryData = {
  employees: EmployeeDirectoryRecord[];
  departments: EmployeeDirectoryOption[];
  positions: EmployeeDirectoryOption[];
  jobTitles: EmployeeDirectoryOption[];
  accounts: EmployeeDirectoryOption[];
  source: "api" | "unavailable";
  error?: string;
};

type ApiEmployee = Omit<EmployeeDirectoryRecord, "name" | "fullName" | "status"> & {
  fullName?: string;
  name?: string;
  status?: EmployeeDirectoryStatus;
};

type ApiDepartment = {
  id: string;
  code?: string;
  name: string;
  headcount?: number;
};

type ApiCatalogItem = {
  id: string;
  code: string;
  name: string;
  family?: string | null;
  rank?: number;
};

type ApiAccount = {
  id: string;
  displayName: string;
  email: string;
  employeeId?: string | null;
  status?: string;
  accountStatus?: string;
};

async function requestJson<T>(path: string) {
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

function normalizeEmployee(employee: ApiEmployee): EmployeeDirectoryRecord {
  const fullName = employee.fullName ?? employee.name ?? employee.code;

  return {
    ...employee,
    fullName,
    name: fullName,
    status: employee.status ?? "active",
    title: employee.title || employee.positionName || employee.jobTitleName || "Chưa cập nhật",
    department: employee.department || "Chưa gán phòng ban"
  };
}

function normalizeDepartment(department: ApiDepartment): EmployeeDirectoryOption {
  return {
    id: department.id,
    code: department.code,
    name: department.name,
    description: department.headcount ? `${department.headcount} nhân sự` : department.code
  };
}

function normalizePosition(position: ApiCatalogItem): EmployeeDirectoryOption {
  return {
    id: position.id,
    code: position.code,
    name: position.name,
    description: position.family ? `${position.code} · ${position.family}` : position.code
  };
}

function normalizeJobTitle(title: ApiCatalogItem): EmployeeDirectoryOption {
  return {
    id: title.id,
    code: title.code,
    name: title.name,
    description: `${title.code} · cấp ${title.rank ?? 0}`
  };
}

function normalizeAccount(account: ApiAccount): EmployeeDirectoryOption {
  return {
    id: account.id,
    name: account.displayName,
    description: account.email,
    employeeId: account.employeeId ?? null,
    status: account.status ?? account.accountStatus ?? null
  };
}

export async function getEmployeeDirectoryData(): Promise<EmployeeDirectoryData> {
  try {
    const [employees, departments, positions, jobTitles] = await Promise.all([
      requestJson<ApiEmployee[]>("/employees"),
      requestJson<ApiDepartment[]>("/departments"),
      requestJson<ApiCatalogItem[]>("/job-positions"),
      requestJson<ApiCatalogItem[]>("/job-titles")
    ]);
    const accounts = await requestJson<ApiAccount[]>("/account-access/accounts").catch(() => []);

    return {
      employees: employees.map(normalizeEmployee),
      departments: departments.map(normalizeDepartment),
      positions: positions.map(normalizePosition),
      jobTitles: jobTitles.map(normalizeJobTitle),
      accounts: accounts.map(normalizeAccount),
      source: "api"
    };
  } catch (error) {
    return {
      employees: [],
      departments: [],
      positions: [],
      jobTitles: [],
      accounts: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach employee directory API"
    };
  }
}
