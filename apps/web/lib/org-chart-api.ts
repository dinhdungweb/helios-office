import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type DepartmentStatus = "active" | "archived";

export type DepartmentHead = {
  id: string;
  code: string;
  name: string;
  title: string;
};

export type DepartmentRecord = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  headId: string | null;
  head: DepartmentHead | null;
  permissionStructure: "company" | "branch" | "department";
  departmentType: string | null;
  businessUnit: string | null;
  description: string | null;
  isManagementUnit: boolean;
  status: DepartmentStatus;
  archivedAt?: string | null;
  headcount: number;
  childCount: number;
};

export type OrgEmployeeOption = {
  id: string;
  code: string;
  name: string;
  title: string;
  department: string;
};

export type OrgChartData = {
  departments: DepartmentRecord[];
  employees: OrgEmployeeOption[];
  source: "api" | "unavailable";
  error?: string;
};

type ApiDepartment = {
  id: string;
  code?: string;
  name: string;
  parentId?: string | null;
  parentName?: string | null;
  headId?: string | null;
  head?: DepartmentHead | null;
  permissionStructure?: "company" | "branch" | "department";
  departmentType?: string | null;
  businessUnit?: string | null;
  description?: string | null;
  isManagementUnit?: boolean;
  status?: DepartmentStatus;
  archivedAt?: string | null;
  headcount?: number;
  childCount?: number;
};

type ApiEmployee = {
  id: string;
  code: string;
  name?: string;
  fullName?: string;
  title: string;
  department: string;
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

function normalizeDepartment(department: ApiDepartment): DepartmentRecord {
  return {
    id: department.id,
    code: department.code ?? department.id,
    name: department.name,
    parentId: department.parentId ?? null,
    parentName: department.parentName ?? null,
    headId: department.headId ?? null,
    head: department.head ?? null,
    permissionStructure: department.permissionStructure ?? "department",
    departmentType: department.departmentType ?? null,
    businessUnit: department.businessUnit ?? null,
    description: department.description ?? null,
    isManagementUnit: department.isManagementUnit ?? false,
    status: department.status ?? "active",
    archivedAt: department.archivedAt ?? null,
    headcount: department.headcount ?? 0,
    childCount: department.childCount ?? 0
  };
}

function normalizeEmployee(employee: ApiEmployee): OrgEmployeeOption {
  return {
    id: employee.id,
    code: employee.code,
    name: employee.name ?? employee.fullName ?? employee.code,
    title: employee.title,
    department: employee.department
  };
}

export async function getOrgChartData(): Promise<OrgChartData> {
  try {
    const [departments, employees] = await Promise.all([
      requestJson<ApiDepartment[]>("/departments?includeArchived=true"),
      requestJson<ApiEmployee[]>("/employees")
    ]);

    return {
      departments: departments.map(normalizeDepartment),
      employees: employees.map(normalizeEmployee),
      source: "api"
    };
  } catch (error) {
    return {
      departments: [],
      employees: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach org chart API"
    };
  }
}
