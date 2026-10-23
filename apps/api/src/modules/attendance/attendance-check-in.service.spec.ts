import { NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceCheckInService, checkInContext, type CheckInContext } from "./attendance-check-in.service";

const me: AuthenticatedUser = {
  sub: "kc-1",
  roles: [],
  claims: {},
  account: { id: "acc-1", email: "khang@helios.test", displayName: "Khang", employeeId: "e1", adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
};
const web: CheckInContext = { source: "web", ip: "113.160.12.9", userAgent: "Chrome" };
const office = { id: "gps-1", name: "Văn phòng", type: "gps", latitude: 21.0285, longitude: 105.8542, radiusMeters: 100, ssid: null, bssid: null, ipRanges: [], status: "active" };
const network = { id: "ip-1", name: "Mạng văn phòng", type: "ip", latitude: null, longitude: null, radiusMeters: 100, ssid: null, bssid: null, ipRanges: ["113.160.12.0/24"], status: "active" };
const approved = { id: "d1", deviceId: "web-1234567890", deviceName: "Laptop", employeeId: "e1", status: "approved" };

function setup(options: { policy?: Record<string, boolean>; device?: unknown; locations?: unknown[]; last?: unknown } = {}) {
  const prisma = {
    employee: { findUnique: jest.fn().mockResolvedValue({ id: "e1", code: "HL-003", attendanceCode: "3", status: "active" }) },
    deviceAuthPolicy: { findUnique: jest.fn().mockResolvedValue({ requireApprovedDevice: true, requireGpsForAttendance: true, requireWifiForOffice: true, ...options.policy }) },
    deviceAuthRequest: { findUnique: jest.fn().mockResolvedValue(options.device === undefined ? approved : options.device), update: jest.fn() },
    attendanceLocation: { findMany: jest.fn().mockResolvedValue(options.locations ?? [office, network]) },
    attendanceRawLog: {
      findFirst: jest.fn().mockResolvedValue(options.last ?? null),
      create: jest.fn(async ({ data }) => ({ id: "log-1", deviceId: null, ...data })),
      findMany: jest.fn().mockResolvedValue([])
    }
  };
  const calculation = { timezone: jest.fn().mockResolvedValue("Asia/Ho_Chi_Minh"), recalculateForPunches: jest.fn() };
  const periods = { assertOpen: jest.fn() };
  const service = new AttendanceCheckInService(prisma as never, calculation as never, periods as never);
  return { service, prisma, calculation, periods };
}

async function reason(promise: Promise<unknown>) {
  try {
    await promise;
    return "accepted";
  } catch (error) {
    if (error instanceof UnprocessableEntityException) {
      const body = error.getResponse() as { reason: string; message: string };
      return `${body.reason}: ${body.message}`;
    }
    throw error;
  }
}

describe("AttendanceCheckInService (AT-13, DV-06)", () => {
  it("records a punch inside a GPS place from an approved device, then recalculates", async () => {
    const { service, prisma, calculation, periods } = setup();
    const result = await service.punch(me, "in", { deviceId: "web-1234567890", latitude: 21.0287, longitude: 105.8543, accuracy: 12 }, web);

    expect(result.duplicate).toBe(false);
    const data = prisma.attendanceRawLog.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      employeeId: "e1",
      employeeCode: "3",
      source: "web",
      direction: "in",
      verifyType: "gps",
      locationId: "gps-1",
      locationName: "Văn phòng",
      clientDeviceId: "web-1234567890",
      clientDeviceName: "Laptop",
      ipAddress: "113.160.12.9",
      accuracyMeters: 12
    });
    expect(data.deviceId).toBeUndefined();
    expect(prisma.deviceAuthRequest.update).toHaveBeenCalledWith({ where: { id: "d1" }, data: { lastUsedAt: expect.any(Date) } });
    expect(calculation.recalculateForPunches).toHaveBeenCalledWith([{ employeeId: "e1", punchTime: data.punchTime }], "punch_sync");
    expect(periods.assertOpen).toHaveBeenCalled();
  });

  it("accepts the office network when GPS is off target, if the policy allows it", async () => {
    const { service, prisma } = setup();
    await service.punch(me, "out", { deviceId: "web-1234567890" }, web);
    expect(prisma.attendanceRawLog.create.mock.calls[0][0].data).toMatchObject({ verifyType: "ip", locationName: "Mạng văn phòng", direction: "out" });
  });

  it("refuses each device problem with its own reason", async () => {
    expect(await reason(setup().service.punch(me, "in", {}, web))).toMatch(/^device_unregistered/);
    expect(await reason(setup({ device: null }).service.punch(me, "in", { deviceId: "web-1234567890" }, web))).toMatch(/^device_unregistered/);
    expect(await reason(setup({ device: { ...approved, employeeId: "e9" } }).service.punch(me, "in", { deviceId: "web-1234567890" }, web))).toMatch(/^device_not_yours/);
    expect(await reason(setup({ device: { ...approved, status: "pending" } }).service.punch(me, "in", { deviceId: "web-1234567890" }, web))).toMatch(/^device_pending/);
    expect(await reason(setup({ device: { ...approved, status: "rejected" } }).service.punch(me, "in", { deviceId: "web-1234567890" }, web))).toMatch(/^device_rejected/);
    expect(await reason(setup({ device: { ...approved, status: "locked" } }).service.punch(me, "in", { deviceId: "web-1234567890" }, web))).toMatch(/^device_locked/);
    // With the switch off, no device is needed.
    expect(await reason(setup({ policy: { requireApprovedDevice: false } }).service.punch(me, "in", { latitude: 21.0285, longitude: 105.8542 }, web))).toBe("accepted");
  });

  it("refuses a punch outside every place, saying how far it was or that there is no position", async () => {
    const away = { ...web, ip: "8.8.8.8" };
    expect(await reason(setup().service.punch(me, "in", { deviceId: "web-1234567890", latitude: 21.0385, longitude: 105.8542 }, away))).toMatch(
      /^outside_places: .*cách Văn phòng khoảng 111\d m, cho phép 100 m; không ở trong mạng văn phòng/
    );
    expect(await reason(setup().service.punch(me, "in", { deviceId: "web-1234567890" }, away))).toMatch(/^no_position: .*không lấy được vị trí GPS/);
    expect(await reason(setup({ locations: [] }).service.punch(me, "in", { deviceId: "web-1234567890" }, web))).toMatch(/^no_places/);
    // GPS only: the office network does not count.
    expect(await reason(setup({ policy: { requireWifiForOffice: false } }).service.punch(me, "in", { deviceId: "web-1234567890" }, web))).toMatch(/^no_position/);
    // Both off: anywhere.
    expect(await reason(setup({ policy: { requireGpsForAttendance: false, requireWifiForOffice: false } }).service.punch(me, "in", { deviceId: "web-1234567890" }, away))).toBe("accepted");
  });

  it("treats a second tap within a minute as the same punch", async () => {
    const last = { id: "log-0", punchTime: new Date(), source: "web", direction: "in", locationName: "Văn phòng", clientDeviceName: "Laptop", deviceId: null };
    const { service, prisma, calculation } = setup({ last });
    await expect(service.punch(me, "in", { deviceId: "web-1234567890", latitude: 21.0285, longitude: 105.8542 }, web)).resolves.toMatchObject({ duplicate: true, punch: { id: "log-0" } });
    expect(prisma.attendanceRawLog.create).not.toHaveBeenCalled();
    expect(calculation.recalculateForPunches).not.toHaveBeenCalled();
  });

  it("needs an employee profile", async () => {
    const noProfile = { ...me, account: { ...me.account!, employeeId: null } } as AuthenticatedUser;
    await expect(setup().service.punch(noProfile, "in", {}, web)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("checkInContext", () => {
  it("trusts the forwarded browser address only with the web service token", () => {
    const headers = { "x-helios-service-token": "secret-token", "x-helios-client-ip": "::ffff:113.160.12.9", "x-helios-client-agent": "Chrome", "user-agent": "node" };
    expect(checkInContext(headers, "127.0.0.1", "secret-token")).toEqual({ source: "web", ip: "113.160.12.9", userAgent: "Chrome" });
    expect(checkInContext({ ...headers, "x-helios-service-token": "wrong-token!" }, "10.1.1.1", "secret-token")).toEqual({ source: "app", ip: "10.1.1.1", userAgent: "node" });
    expect(checkInContext(headers, "10.1.1.1", undefined)).toMatchObject({ source: "app", ip: "10.1.1.1" });
  });
});
