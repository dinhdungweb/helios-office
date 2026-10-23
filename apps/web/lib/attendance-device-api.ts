import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

// Data for "Công → Máy chấm công": machines (AT-19), punches the sync refused (AT-20) and raw
// punches (AT-21).

export type DeviceView = "devices" | "errors" | "logs";

export type AttendanceDeviceRecord = {
  id: string;
  deviceId: string;
  deviceName: string | null;
  storeCode: string | null;
  workplaceId: string | null;
  workplace: { id: string; name: string } | null;
  note: string | null;
  status: "active" | "inactive";
  lastSyncAt: string | null;
  createdAt: string;
  logCount: number;
  errorCount: number;
};

export type RawLogRecord = {
  id: string;
  punchTime: string;
  verifyType: string | null;
  employeeCode: string;
  syncedAt: string;
  employee: { id: string; code: string; fullName: string; department: string };
  device: { deviceId: string; deviceName: string | null };
};

export type SyncErrorRecord = {
  id: string;
  employeeCode: string | null;
  punchTime: string | null;
  errorType: string;
  errorLabel: string;
  device: { deviceId: string; deviceName: string | null };
  createdAt: string;
  sameCodeOpen: number;
  resolvedAt: string | null;
  resolution: "assigned" | "dismissed" | null;
  resolutionNote: string | null;
};

export type Paged<T> = { items: T[]; total: number; page: number; limit: number; pageCount: number };

export type DeviceFilters = { from?: string; to?: string; deviceId?: string; q?: string; status?: string; page?: number };

export type DeviceBoardData =
  | {
      source: "api";
      view: DeviceView;
      devices: AttendanceDeviceRecord[];
      workplaces: Array<{ id: string; name: string }>;
      logs: (Paged<RawLogRecord> & { from: string; to: string }) | null;
      errors: Paged<SyncErrorRecord> | null;
      openErrors: number | null;
    }
  | { source: "unavailable"; view: DeviceView; error: string };

async function requestJson<T>(path: string) {
  const accessToken = await getSessionAccessToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.toString();
}

export async function getDeviceBoardData(view: DeviceView, access: { devices: boolean; errors: boolean; logs: boolean }, filters: DeviceFilters): Promise<DeviceBoardData> {
  const page = filters.page ?? 1;
  try {
    const [devices, workplaces, logs, errors, open] = await Promise.all([
      access.devices ? requestJson<AttendanceDeviceRecord[]>("/attendance-devices") : Promise.resolve([]),
      access.devices && view === "devices"
        ? requestJson<Array<{ id: string; name: string; status: string }>>("/workplaces").catch(() => [])
        : Promise.resolve([]),
      view === "logs"
        ? requestJson<Paged<RawLogRecord> & { from: string; to: string }>(
            `/attendance/raw-logs?${query({ from: filters.from, to: filters.to, deviceId: filters.deviceId, q: filters.q, page, limit: 50 })}`
          )
        : Promise.resolve(null),
      view === "errors"
        ? requestJson<Paged<SyncErrorRecord>>(`/attendance/sync-errors?${query({ status: filters.status, deviceId: filters.deviceId, q: filters.q, page, limit: 50 })}`)
        : Promise.resolve(null),
      // Badge on the "Lỗi đồng bộ" switch.
      access.errors ? requestJson<Paged<SyncErrorRecord>>("/attendance/sync-errors?limit=1").catch(() => null) : Promise.resolve(null)
    ]);
    return {
      source: "api",
      view,
      devices,
      workplaces: workplaces.filter((item) => item.status !== "archived").map(({ id, name }) => ({ id, name })),
      logs,
      errors,
      openErrors: open?.total ?? null
    };
  } catch (error) {
    const forbidden = error instanceof Error && error.message.endsWith("returned 403");
    return {
      source: "unavailable",
      view,
      error: forbidden ? "Tài khoản của bạn không có quyền xem mục này." : error instanceof Error && error.message.includes("returned 400") ? "Bộ lọc không hợp lệ." : "Không tải được dữ liệu máy chấm công. Thử tải lại trang."
    };
  }
}
