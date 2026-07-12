import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import type { PermissionGroup } from "@/lib/account-access-api";

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

export type JobPositionOption = {
  id: string;
  code: string;
  name: string;
  family: string | null;
};

export type JobTitleOption = {
  id: string;
  code: string;
  name: string;
  rank: number;
};

export type EmployeeCreateData = {
  departments: DepartmentOption[];
  positions: JobPositionOption[];
  jobTitles: JobTitleOption[];
  managers: EmployeeOption[];
  groups: PermissionGroup[];
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

type ApiPermissionGroup = {
  id: string;
  name: string;
  description?: string;
  roleScope?: "system_admin" | "user";
  status?: "active" | "archived";
  archivedAt?: string | null;
  memberCount?: number;
  permissionKeys?: string[];
};

type ApiJobPosition = {
  id: string;
  code: string;
  name: string;
  family?: string | null;
};

type ApiJobTitle = {
  id: string;
  code: string;
  name: string;
  rank?: number;
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

function normalizeGroup(group: ApiPermissionGroup): PermissionGroup {
  return {
    id: group.id,
    name: group.name,
    summary: group.description ?? group.name,
    role: group.roleScope ?? "user",
    status: group.status === "archived" ? "archived" : "active",
    archivedAt: group.archivedAt ?? null,
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

function normalizePosition(position: ApiJobPosition): JobPositionOption {
  return {
    id: position.id,
    code: position.code,
    name: position.name,
    family: position.family ?? null
  };
}

function normalizeJobTitle(title: ApiJobTitle): JobTitleOption {
  return {
    id: title.id,
    code: title.code,
    name: title.name,
    rank: title.rank ?? 0
  };
}

export async function getEmployeeCreateData(): Promise<EmployeeCreateData> {
  try {
    const [departments, positions, jobTitles, employees, groups] = await Promise.all([
      requestJson<ApiDepartment[]>("/departments"),
      requestJson<ApiJobPosition[]>("/job-positions"),
      requestJson<ApiJobTitle[]>("/job-titles"),
      requestJson<ApiEmployee[]>("/employees"),
      requestJson<ApiPermissionGroup[]>("/account-access/groups")
    ]);

    return {
      departments,
      positions: positions.map(normalizePosition),
      jobTitles: jobTitles.map(normalizeJobTitle),
      managers: employees.map(normalizeEmployee),
      groups: groups.map(normalizeGroup),
      source: "api"
    };
  } catch (error) {
    return {
      departments: [],
      positions: [],
      jobTitles: [],
      managers: [],
      groups: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach employee create API"
    };
  }
}
