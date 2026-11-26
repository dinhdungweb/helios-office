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

// Both methods on and asking for an approved device, as the existing tests expect.
const POLICY = {
  requireGpsForAttendance: true,
  requireWifiForOffice: true,
  gpsAllowWithoutShift: false,
  gpsRequireApprovedDevice: true,
  gpsRequirePhoto: false,
  gpsCheckEntities: false,
  wifiAllowWithoutShift: false,
  wifiRequireApprovedDevice: true,
  wifiRequirePhoto: false,
  wifiCheckEntities: false
};
const hc = { id: "hc", name: "Hành chính", startMinute: 480, endMinute: 1020, breakStartMinute: null, breakEndMinute: null, type: "fixed", requiredMinutes: 540, workUnits: 1, punchWindowAfterMinutes: null, locationIds: ["gps-1"], applyDepartmentIds: [], applyPositionIds: [], autoDetect: false, status: "active" };

function setup(options: { policy?: Record<string, boolean>; device?: unknown; locations?: unknown[]; last?: unknown; photo?: unknown; photoUsed?: boolean; noShift?: boolean; shift?: Record<string, unknown> } = {}) {
  const prisma = {
    employee: { findUnique: jest.fn().mockResolvedValue({ id: "e1", code: "HL-003", attendanceCode: "3", status: "active", departmentId: "d-sales", positionId: null, department: { defaultShiftId: null } }) },
    deviceAuthPolicy: { findUnique: jest.fn().mockResolvedValue({ ...POLICY, ...options.policy }) },
    shiftAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    holiday: { findMany: jest.fn().mockResolvedValue([]) },
    shift: { findMany: jest.fn().mockResolvedValue([{ ...hc, ...options.shift }]) },
    deviceAuthRequest: { findUnique: jest.fn().mockResolvedValue(options.device === undefined ? approved : options.device), update: jest.fn() },
    storedFile: { findUnique: jest.fn().mockResolvedValue(options.photo === undefined ? { id: "f1", purpose: "checkin_photo", ownerId: "e1", status: "ready" } : options.photo) },
    attendanceLocation: { findMany: jest.fn().mockResolvedValue(options.locations ?? [office, network]) },
    attendanceRawLog: {
      findFirst: jest.fn(async ({ where }) => (where.photoFileId ? (options.photoUsed ? { id: "other" } : null) : (options.last ?? null))),
      create: jest.fn(async ({ data }) => ({ id: "log-1", deviceId: null, ...data })),
      findMany: jest.fn().mockResolvedValue([])
    }
  };
  const calculation = {
    timezone: jest.fn().mockResolvedValue("Asia/Ho_Chi_Minh"),
    // Every weekday has the company's HC shift unless the test takes it away.
    getPolicy: jest.fn().mockResolvedValue({ defaultShiftId: options.noShift ? null : "hc", workWeekdays: [1, 2, 3, 4, 5, 6, 7], punchWindowAfterMinutes: 240 }),
    recalculateForPunches: jest.fn()
  };
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
    expect(await reason(setup({ policy: { gpsRequireApprovedDevice: false } }).service.punch(me, "in", { latitude: 21.0285, longitude: 105.8542 }, web))).toBe("accepted");
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
    // Both off, as 1Office: no web/app check-in at all.
    expect(await reason(setup({ policy: { requireGpsForAttendance: false, requireWifiForOffice: false } }).service.punch(me, "in", { deviceId: "web-1234567890" }, away))).toMatch(/^not_enabled/);
  });

  it("treats a second tap within a minute as the same punch", async () => {
    const last = { id: "log-0", punchTime: new Date(), source: "web", direction: "in", locationName: "Văn phòng", clientDeviceName: "Laptop", deviceId: null };
    const { service, prisma, calculation } = setup({ last });
    await expect(service.punch(me, "in", { deviceId: "web-1234567890", latitude: 21.0285, longitude: 105.8542 }, web)).resolves.toMatchObject({ duplicate: true, punch: { id: "log-0" } });
    expect(prisma.attendanceRawLog.create).not.toHaveBeenCalled();
    expect(calculation.recalculateForPunches).not.toHaveBeenCalled();
  });

  it("takes a photo of mine, and refuses a missing, foreign or reused one (AT-14)", async () => {
    const inside = { deviceId: "web-1234567890", latitude: 21.0285, longitude: 105.8542 };
    const photo = "8f14e45f-ceea-467a-9f3c-2a1b5c6d7e8f";
    const ok = setup({ policy: { gpsRequirePhoto: true } });
    await ok.service.punch(me, "in", { ...inside, photoFileId: photo }, web);
    expect(ok.prisma.attendanceRawLog.create.mock.calls[0][0].data.photoFileId).toBe(photo);

    expect(await reason(setup({ policy: { gpsRequirePhoto: true } }).service.punch(me, "in", inside, web))).toMatch(/^photo_required/);
    expect(await reason(setup({ photo: { id: "f1", purpose: "checkin_photo", ownerId: "e9", status: "ready" } }).service.punch(me, "in", { ...inside, photoFileId: photo }, web))).toMatch(/^photo_invalid/);
    expect(await reason(setup({ photo: { id: "f1", purpose: "checkin_photo", ownerId: "e1", status: "pending" } }).service.punch(me, "in", { ...inside, photoFileId: photo }, web))).toMatch(/^photo_invalid/);
    expect(await reason(setup({ photoUsed: true }).service.punch(me, "in", { ...inside, photoFileId: photo }, web))).toMatch(/^photo_invalid: .*đã dùng/);
    // Optional photo: a punch without one is fine.
    expect(await reason(setup().service.punch(me, "in", inside, web))).toBe("accepted");
  });

  it("applies the rules of the method that matched, GPS and Wifi separately (as 1Office)", async () => {
    const inside = { latitude: 21.0285, longitude: 105.8542 };
    // GPS asks for a photo, Wifi does not: a punch on the office network needs none.
    expect(await reason(setup({ policy: { gpsRequirePhoto: true, wifiRequireApprovedDevice: false } }).service.punch(me, "in", {}, web))).toBe("accepted");
    expect(await reason(setup({ policy: { gpsRequirePhoto: true } }).service.punch(me, "in", { deviceId: "web-1234567890", ...inside }, web))).toMatch(/^photo_required/);
    // Device only for Wifi: a GPS punch from an unregistered browser is fine.
    expect(await reason(setup({ policy: { gpsRequireApprovedDevice: false } }).service.punch(me, "in", inside, { ...web, ip: "8.8.8.8" }))).toBe("accepted");
    expect(await reason(setup({ policy: { gpsRequireApprovedDevice: false, requireGpsForAttendance: false } }).service.punch(me, "in", {}, web))).toMatch(/^device_unregistered/);
  });

  it("needs a shift unless the method allows checking in without one", async () => {
    const inside = { deviceId: "web-1234567890", latitude: 21.0285, longitude: 105.8542 };
    expect(await reason(setup({ noShift: true }).service.punch(me, "in", inside, web))).toMatch(/^no_shift: Hôm nay bạn chưa được xếp ca, không chấm công GPS/);
    expect(await reason(setup({ noShift: true, policy: { gpsAllowWithoutShift: true } }).service.punch(me, "in", inside, web))).toBe("accepted");
    // A detected shift (AT-29) that applies to the person counts as a shift.
    expect(await reason(setup({ noShift: true, shift: { autoDetect: true } }).service.punch(me, "in", inside, web))).toBe("accepted");
  });

  it("checks applicable entities: only places of the person's shift, and only a shift that applies to them", async () => {
    const inside = { deviceId: "web-1234567890", latitude: 21.0285, longitude: 105.8542 };
    const strict = { gpsCheckEntities: true, requireWifiForOffice: false };
    expect(await reason(setup({ policy: strict }).service.punch(me, "in", inside, web))).toBe("accepted");
    expect(await reason(setup({ policy: strict, shift: { locationIds: [] } }).service.punch(me, "in", inside, web))).toMatch(/^outside_places: .*ca Hành chính chưa có điểm GPS/);
    expect(await reason(setup({ policy: strict, shift: { applyDepartmentIds: ["d-office"] } }).service.punch(me, "in", inside, web))).toMatch(/hôm nay bạn không có ca áp dụng/);
    // The office network is still a way in when Wifi does not check entities.
    expect(await reason(setup({ policy: { gpsCheckEntities: true }, shift: { locationIds: [] } }).service.punch(me, "in", { deviceId: "web-1234567890" }, web))).toBe("accepted");
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

describe("CheckinPhotoFilePolicy (AT-14)", () => {
  const { CheckinPhotoFilePolicy } = jest.requireActual("./checkin-photo-file.policy") as typeof import("./checkin-photo-file.policy");
  const hr = { ...me, account: { ...me.account!, employeeId: "emp-hr", effectivePermissionKeys: ["permission.attendance.view"] } } as AuthenticatedUser;
  const stranger = { ...me, account: { ...me.account!, employeeId: "e5", effectivePermissionKeys: [] } } as AuthenticatedUser;
  const file = { ownerId: "e1" } as never;

  function policy(inScope: boolean) {
    const dataScope = {
      resolve: jest.fn().mockResolvedValue({ level: "department" }),
      assertEmployeeInScope: jest.fn(async () => {
        if (!inScope) throw new NotFoundException();
      })
    };
    return new CheckinPhotoFilePolicy({ registerPolicy: jest.fn() } as never, dataScope as never);
  }

  it("lets me upload only my own photo and nobody delete one", async () => {
    await expect(policy(true).canUpload(me, { ownerType: "Employee", ownerId: "e1" })).resolves.toBe(true);
    await expect(policy(true).canUpload(me, { ownerType: "Employee", ownerId: "e9" })).resolves.toBe(false);
    await expect(policy(true).canDelete()).resolves.toBe(false);
  });

  it("shows the photo to its owner and to attendance viewers with the owner in scope", async () => {
    await expect(policy(false).canRead(me, file)).resolves.toBe(true);
    await expect(policy(true).canRead(hr, file)).resolves.toBe(true);
    await expect(policy(false).canRead(hr, file)).resolves.toBe(false);
    await expect(policy(true).canRead(stranger, file)).resolves.toBe(false);
  });
});
