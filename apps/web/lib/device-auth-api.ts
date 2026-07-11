import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";
import {
  deviceAuthPolicy as fallbackPolicy,
  deviceAuthRequests as fallbackRequests
} from "@/lib/mock-data";

export type DeviceAuthStatus = "pending" | "approved" | "rejected" | "locked";

export type DeviceAuthRequest = {
  id: string;
  employeeCode: string;
  employeeName: string;
  avatar: string;
  department: string;
  branch: string;
  deviceName: string;
  deviceId: string;
  submittedAt: string;
  status: DeviceAuthStatus;
  lastUsedAt?: string;
  note?: string;
};

export type DeviceAuthPolicy = {
  maxDevicesPerUser: number;
  requireNotificationEnabled: boolean;
  requireGpsForAttendance: boolean;
  requireWifiForOffice: boolean;
  approvalRefreshHint: string;
};

export type DeviceAuthData = {
  requests: DeviceAuthRequest[];
  policy: DeviceAuthPolicy;
  source: "api" | "unavailable";
  error?: string;
};

export type DeviceAuthPolicyPayload = Partial<DeviceAuthPolicy>;

type ApiDeviceAuthRequest = Omit<DeviceAuthRequest, "lastUsedAt" | "note"> & {
  lastUsedAt?: string | null;
  note?: string | null;
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
      throw new Error("Bạn cần đăng nhập bằng tài khoản admin để quản lý xác thực thiết bị.");
    }

    if (response.status === 403) {
      throw new Error("Tài khoản hiện tại không có quyền quản trị hệ thống.");
    }

    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function normalizeRequest(request: ApiDeviceAuthRequest): DeviceAuthRequest {
  return {
    ...request,
    lastUsedAt: request.lastUsedAt ?? undefined,
    note: request.note ?? undefined
  };
}

export async function getDeviceAuthData(): Promise<DeviceAuthData> {
  try {
    const [requests, policy] = await Promise.all([
      requestJson<ApiDeviceAuthRequest[]>("/device-auth/requests"),
      requestJson<DeviceAuthPolicy>("/device-auth/policy")
    ]);

    return {
      requests: requests.map(normalizeRequest),
      policy,
      source: "api"
    };
  } catch (error) {
    return {
      requests: fallbackRequests,
      policy: fallbackPolicy,
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach device auth API"
    };
  }
}

export async function updateDeviceAuthStatus(requestId: string, status: DeviceAuthStatus) {
  const request = await requestJson<ApiDeviceAuthRequest>(`/device-auth/requests/${requestId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });

  return normalizeRequest(request);
}

export async function deleteDeviceAuthRequest(requestId: string) {
  return requestJson<{ ok: boolean }>(`/device-auth/requests/${requestId}`, {
    method: "DELETE"
  });
}

export async function updateDeviceAuthPolicy(payload: DeviceAuthPolicyPayload) {
  return requestJson<DeviceAuthPolicy>("/device-auth/policy", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}
