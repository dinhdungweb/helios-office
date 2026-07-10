import { getApiBaseUrl } from "@/lib/api-base";
import type {
  AccountLicense,
  AccountLicensePlan,
  PermissionGroup
} from "@/lib/account-access-api";

export type DepartmentOption = {
  id: string;
  name: string;
  headcount?: number;
};

export type EmployeeOption = {
  id: string;
  code: string;
  name: string;
  title: string;
  department: string;
};

export type EmployeeCreateData = {
  departments: DepartmentOption[];
  managers: EmployeeOption[];
  groups: PermissionGroup[];
  licenses: AccountLicense[];
  source: "api" | "unavailable";
  error?: string;
};

type ApiDepartment = {
  id: string;
  name: string;
  headcount?: number;
};

type ApiEmployee = {
  id: string;
  code: string;
  name?: string;
  fullName?: string;
  title: string;
  department: string;
};

type ApiLicense = {
  id: AccountLicensePlan;
  name: string;
  description?: string;
  modules?: string[];
};

type ApiPermissionGroup = {
  id: string;
  name: string;
  description?: string;
  roleScope?: "system_admin" | "user";
  licensePlan?: AccountLicensePlan;
  memberCount?: number;
  permissionKeys?: string[];
};

const licenseSeatLimits: Record<AccountLicensePlan, number> = {
  standard: 140,
  professional: 45,
  enterprise: 15
};

async function requestJson<T>(path: string) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function normalizeLicense(license: ApiLicense): AccountLicense {
  return {
    key: license.id,
    name: license.name,
    summary: license.description ?? license.name,
    modules: license.modules ?? [],
    seatLimit: licenseSeatLimits[license.id]
  };
}

function normalizeGroup(group: ApiPermissionGroup): PermissionGroup {
  return {
    id: group.id,
    name: group.name,
    summary: group.description ?? group.name,
    role: group.roleScope ?? "user",
    licensePlan: group.licensePlan ?? "standard",
    memberCount: group.memberCount ?? 0,
    permissionKeys: group.permissionKeys ?? []
  };
}

function normalizeEmployee(employee: ApiEmployee): EmployeeOption {
  return {
    id: employee.id,
    code: employee.code,
    name: employee.name ?? employee.fullName ?? employee.code,
    title: employee.title,
    department: employee.department
  };
}

export async function getEmployeeCreateData(): Promise<EmployeeCreateData> {
  try {
    const [departments, employees, groups, licenses] = await Promise.all([
      requestJson<ApiDepartment[]>("/departments"),
      requestJson<ApiEmployee[]>("/employees"),
      requestJson<ApiPermissionGroup[]>("/account-access/groups"),
      requestJson<ApiLicense[]>("/account-access/licenses")
    ]);

    return {
      departments,
      managers: employees.map(normalizeEmployee),
      groups: groups.map(normalizeGroup),
      licenses: licenses.map(normalizeLicense),
      source: "api"
    };
  } catch (error) {
    return {
      departments: [],
      managers: [],
      groups: [],
      licenses: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach employee create API"
    };
  }
}
