import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type PersonnelContractStatus = "active" | "ended" | "renewal_due" | "draft" | string;

export type PersonnelContractRecord = {
  id: string;
  code: string;
  creatorName: string;
  createdAt?: string | null;
  employeeCode?: string | null;
  employeeId?: string | null;
  employeeName: string;
  departmentName: string;
  positionName?: string | null;
  jobTitleName?: string | null;
  contractName: string;
  digitalStatus: string;
  signingProfileStatus: string;
  signedCompletedAt?: string | null;
  signedDate?: string | null;
  startDate: string;
  endDate?: string | null;
  status: PersonnelContractStatus;
};

export type PersonnelContractDirectoryData = {
  contracts: PersonnelContractRecord[];
  error?: string;
  source: "api" | "unavailable";
};

export type PersonnelContractDetailData = PersonnelContractDirectoryData & {
  contract: PersonnelContractRecord | null;
};

type ApiContract = {
  id: string;
  code?: string | null;
  contractCode?: string | null;
  employeeId?: string | null;
  type?: string | null;
  name?: string | null;
  title?: string | null;
  startDate: string;
  endDate?: string | null;
  status?: PersonnelContractStatus | null;
  signedDate?: string | null;
  signedCompletedAt?: string | null;
  digitalStatus?: string | null;
  signingProfileStatus?: string | null;
  createdAt?: string | null;
  creatorName?: string | null;
  employee?: {
    id?: string;
    code?: string;
    fullName?: string;
    name?: string;
    department?: {
      name?: string;
    } | null;
    departmentName?: string | null;
  } | null;
};

type ApiEmployee = {
  id: string;
  code?: string;
  fullName?: string;
  name?: string;
  department?: string | { name?: string } | null;
  departmentName?: string | null;
  positionName?: string | null;
  jobTitleName?: string | null;
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

function employeeDepartment(employee?: ApiEmployee | null) {
  if (!employee?.department) {
    return employee?.departmentName ?? "--";
  }

  if (typeof employee.department === "string") {
    return employee.department;
  }

  return employee.department.name ?? employee.departmentName ?? "--";
}

function contractTypeLabel(value?: string | null) {
  const labels: Record<string, string> = {
    fixed_term: "Hợp đồng chính thức",
    indefinite: "Hợp đồng chính thức",
    official: "Hợp đồng chính thức",
    probation: "Hợp đồng thử việc",
    seasonal: "Hợp đồng thời vụ",
    service: "Hợp đồng dịch vụ"
  };

  if (!value) {
    return "--";
  }

  return labels[value] ?? value;
}

function resolveStatus(contract: ApiContract): PersonnelContractStatus {
  const endDate = contract.endDate ? new Date(contract.endDate) : null;

  if (contract.status === "ended" || contract.status === "terminated" || contract.status === "liquidated") {
    return "ended";
  }

  if (endDate && Number.isFinite(endDate.valueOf()) && endDate.getTime() < Date.now()) {
    return "ended";
  }

  return contract.status ?? "active";
}

function normalizeContract(contract: ApiContract, employeeById: Map<string, ApiEmployee>, index: number): PersonnelContractRecord {
  const employee = contract.employeeId ? employeeById.get(contract.employeeId) : null;
  const contractEmployee = contract.employee;
  const employeeCode = contractEmployee?.code ?? employee?.code ?? null;
  const employeeName = contractEmployee?.fullName ?? contractEmployee?.name ?? employee?.fullName ?? employee?.name ?? "Nhân sự";
  const departmentName = contractEmployee?.department?.name ?? contractEmployee?.departmentName ?? employeeDepartment(employee);
  const positionName = employee?.positionName ?? null;
  const jobTitleName = employee?.jobTitleName ?? null;
  const numberSuffix = String(index + 1).padStart(2, "0");
  const code = contract.code ?? contract.contractCode ?? (employeeCode ? `${employeeCode}-${numberSuffix}` : contract.id);

  return {
    id: contract.id,
    code,
    creatorName: contract.creatorName ?? "Admin",
    createdAt: contract.createdAt ?? null,
    employeeCode,
    employeeId: contract.employeeId ?? contractEmployee?.id ?? null,
    employeeName,
    departmentName,
    positionName,
    jobTitleName,
    contractName: contract.name ?? contract.title ?? contractTypeLabel(contract.type),
    digitalStatus: contract.digitalStatus ?? "Chưa tạo",
    signingProfileStatus: contract.signingProfileStatus ?? "--",
    signedCompletedAt: contract.signedCompletedAt ?? null,
    signedDate: contract.signedDate ?? null,
    startDate: contract.startDate,
    endDate: contract.endDate ?? null,
    status: resolveStatus(contract)
  };
}

export async function getPersonnelContractDirectoryData(): Promise<PersonnelContractDirectoryData> {
  try {
    const [contracts, employees] = await Promise.all([
      requestJson<ApiContract[]>("/contracts"),
      requestJson<ApiEmployee[]>("/employees").catch(() => [])
    ]);
    const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

    return {
      contracts: contracts.map((contract, index) => normalizeContract(contract, employeeById, index)),
      source: "api"
    };
  } catch (error) {
    return {
      contracts: [],
      error: error instanceof Error ? error.message : "Cannot reach contract directory API",
      source: "unavailable"
    };
  }
}

export async function getPersonnelContractDetailData(contractId?: string | null): Promise<PersonnelContractDetailData> {
  const data = await getPersonnelContractDirectoryData();
  const normalizedId = contractId?.trim();
  const contract = normalizedId
    ? data.contracts.find(
        (item) =>
          item.id === normalizedId ||
          item.code === normalizedId ||
          item.employeeId === normalizedId ||
          item.employeeCode === normalizedId
      ) ?? data.contracts[0] ?? null
    : data.contracts[0] ?? null;

  return {
    ...data,
    contract
  };
}
