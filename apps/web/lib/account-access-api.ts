import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type AccountRole = "system_admin" | "user";
export type AccountLifecycleStatus = "pending_activation" | "active" | "closed";
export type PermissionGroupStatus = "active" | "archived";

export type AccountAccessSummary = {
  totalAccounts: number;
  activeAccounts: number;
  pendingActivation: number;
  closedAccounts: number;
  systemAdmins: number;
  customizedAccounts: number;
};

export type AccountPermission = {
  key: string;
  category: string;
  label: string;
  description?: string | null;
  adminOnly: boolean;
  sortOrder?: number;
};

export type PermissionGroup = {
  id: string;
  name: string;
  summary: string;
  role: AccountRole;
  status: PermissionGroupStatus;
  archivedAt?: string | null;
  memberCount: number;
  permissionKeys: string[];
};

export type AccountProvisionEmployee = {
  id: string;
  code: string;
  name: string;
  title: string;
  department: string;
  accountEmail?: string | null;
};

export type ManagedUserAccount = {
  id: string;
  employeeCode?: string;
  name: string;
  email: string;
  avatar: string;
  title: string;
  department: string;
  role: AccountRole;
  groupId: string | null;
  status: AccountLifecycleStatus;
  customPermissionKeys: string[];
  effectivePermissionKeys: string[];
  customPermissionNote?: string | null;
  passwordResetRequired: boolean;
  inviteEmailRequested: boolean;
  temporaryPasswordIssuedAt?: string | null;
  inviteSentAt?: string | null;
  activatedAt?: string | null;
  closedAt?: string | null;
};

export type AccountAccessData = {
  summary: AccountAccessSummary;
  accounts: ManagedUserAccount[];
  permissions: AccountPermission[];
  groups: PermissionGroup[];
  availableEmployees: AccountProvisionEmployee[];
  source: "api" | "unavailable";
  error?: string;
};

export type AccountMutationPayload = {
  username?: string;
  initialPassword?: string;
  requirePasswordChange?: boolean;
  sendInviteEmail?: boolean;
  email?: string;
  displayName?: string;
  adminRole?: AccountRole;
  accountStatus?: AccountLifecycleStatus;
  permissionGroupId?: string | null;
  employeeId?: string | null;
  customPermissionKeys?: string[];
  customPermissionNote?: string | null;
};

export type PermissionGroupMutationPayload = {
  name: string;
  description: string;
  roleScope?: AccountRole;
  permissionKeys?: string[];
};

type ApiPermission = {
  key: string;
  category: string;
  label: string;
  description?: string | null;
  adminOnly: boolean;
  sortOrder?: number;
};

type ApiPermissionGroup = {
  id: string;
  name: string;
  description?: string;
  roleScope?: AccountRole;
  status?: PermissionGroupStatus;
  archivedAt?: string | null;
  memberCount?: number;
  permissionKeys?: string[];
};

type ApiAccount = {
  id: string;
  email: string;
  displayName: string;
  role?: AccountRole;
  adminRole?: AccountRole;
  status?: AccountLifecycleStatus;
  accountStatus?: AccountLifecycleStatus;
  groupId?: string | null;
  permissionGroupId?: string | null;
  customPermissionKeys?: string[];
  effectivePermissionKeys?: string[];
  customPermissionNote?: string | null;
  passwordResetRequired?: boolean;
  inviteEmailRequested?: boolean;
  temporaryPasswordIssuedAt?: string | null;
  inviteSentAt?: string | null;
  activatedAt?: string | null;
  closedAt?: string | null;
  employee?: {
    code?: string;
    title?: string;
    department?: string;
  } | null;
};

type ApiEmployee = {
  id: string;
  code: string;
  name?: string;
  fullName?: string;
  title: string;
  department: string;
  accountEmail?: string | null;
};

const emptySummary: AccountAccessSummary = {
  totalAccounts: 0,
  activeAccounts: 0,
  pendingActivation: 0,
  closedAccounts: 0,
  systemAdmins: 0,
  customizedAccounts: 0
};

function apiBaseUrl() {
  return getApiBaseUrl();
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const accessToken = await getSessionAccessToken();

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Bạn cần đăng nhập bằng tài khoản admin để thực hiện thao tác này.");
    }

    if (response.status === 403) {
      throw new Error("Tài khoản hiện tại không có quyền quản trị hệ thống.");
    }

    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}

function toAccountRole(value: string | undefined): AccountRole {
  return value === "system_admin" ? "system_admin" : "user";
}

function toLifecycleStatus(value: string | undefined): AccountLifecycleStatus {
  if (value === "active" || value === "closed") {
    return value;
  }

  return "pending_activation";
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function normalizeGroup(group: ApiPermissionGroup): PermissionGroup {
  return {
    id: group.id,
    name: group.name,
    summary: group.description ?? "Chua co mo ta.",
    role: toAccountRole(group.roleScope),
    status: group.status === "archived" ? "archived" : "active",
    archivedAt: group.archivedAt ?? null,
    memberCount: group.memberCount ?? 0,
    permissionKeys: group.permissionKeys ?? []
  };
}

function normalizeAccount(account: ApiAccount): ManagedUserAccount {
  const name = account.displayName;

  return {
    id: account.id,
    employeeCode: account.employee?.code,
    name,
    email: account.email,
    avatar: initialsFromName(name),
    title: account.employee?.title ?? "Chua gan nhan su",
    department: account.employee?.department ?? "Chua gan phong ban",
    role: toAccountRole(account.role ?? account.adminRole),
    groupId: account.groupId ?? account.permissionGroupId ?? null,
    status: toLifecycleStatus(account.status ?? account.accountStatus),
    customPermissionKeys: account.customPermissionKeys ?? [],
    effectivePermissionKeys: account.effectivePermissionKeys ?? [],
    customPermissionNote: account.customPermissionNote,
    passwordResetRequired: Boolean(account.passwordResetRequired),
    inviteEmailRequested: Boolean(account.inviteEmailRequested),
    temporaryPasswordIssuedAt: formatDate(account.temporaryPasswordIssuedAt),
    inviteSentAt: formatDate(account.inviteSentAt),
    activatedAt: formatDate(account.activatedAt),
    closedAt: formatDate(account.closedAt)
  };
}

function normalizeProvisionEmployee(employee: ApiEmployee): AccountProvisionEmployee {
  return {
    id: employee.id,
    code: employee.code,
    name: employee.name ?? employee.fullName ?? employee.code,
    title: employee.title,
    department: employee.department,
    accountEmail: employee.accountEmail
  };
}

export async function getAccountAccessData(): Promise<AccountAccessData> {
  try {
    const [summary, accounts, groups, permissions, employees] = await Promise.all([
      fetchJson<AccountAccessSummary>("/account-access/summary"),
      fetchJson<ApiAccount[]>("/account-access/accounts"),
      fetchJson<ApiPermissionGroup[]>("/account-access/groups"),
      fetchJson<ApiPermission[]>("/account-access/permissions"),
      fetchJson<ApiEmployee[]>("/employees")
    ]);

    return {
      summary,
      accounts: accounts.map(normalizeAccount),
      groups: groups.map(normalizeGroup),
      permissions,
      availableEmployees: employees.map(normalizeProvisionEmployee).filter((employee) => !employee.accountEmail),
      source: "api"
    };
  } catch (error) {
    return {
      summary: emptySummary,
      accounts: [],
      groups: [],
      permissions: [],
      availableEmployees: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach account access API"
    };
  }
}

export async function activateAccount(accountId: string) {
  return requestJson<unknown>(`/account-access/accounts/${accountId}/activate`, {
    method: "POST"
  });
}

export async function closeAccount(accountId: string) {
  return requestJson<unknown>(`/account-access/accounts/${accountId}/close`, {
    method: "POST"
  });
}

export async function resendAccountInvite(accountId: string) {
  return requestJson<unknown>(`/account-access/accounts/${accountId}/resend-invite`, {
    method: "POST"
  });
}

export async function createAccount(
  payload: Required<Pick<AccountMutationPayload, "email" | "displayName">> & AccountMutationPayload
) {
  return requestJson<unknown>("/account-access/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function updateAccount(accountId: string, payload: AccountMutationPayload) {
  return requestJson<unknown>(`/account-access/accounts/${accountId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function createPermissionGroup(payload: PermissionGroupMutationPayload) {
  return requestJson<unknown>("/account-access/groups", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function updatePermissionGroup(groupId: string, payload: PermissionGroupMutationPayload) {
  return requestJson<unknown>(`/account-access/groups/${groupId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function archivePermissionGroup(groupId: string) {
  return requestJson<unknown>(`/account-access/groups/${groupId}/archive`, {
    method: "POST"
  });
}

export async function restorePermissionGroup(groupId: string) {
  return requestJson<unknown>(`/account-access/groups/${groupId}/restore`, {
    method: "POST"
  });
}
