import { ConflictException, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { DeviceAuthService } from "./device-auth.service";

const me: AuthenticatedUser = {
  sub: "kc-1",
  roles: [],
  claims: {},
  account: { id: "acc-1", email: "khang@helios.test", displayName: "Khang", employeeId: "e1", adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
};

const request = (overrides: Record<string, unknown> = {}) => ({
  id: "r1",
  employeeId: "e1",
  deviceId: "web-1234567890",
  deviceName: "Chrome · Windows",
  status: "pending",
  submittedAt: new Date("2026-10-23T02:00:00.000Z"),
  lastUsedAt: null,
  note: null,
  ...overrides
});

function setup(options: { existing?: unknown; inUse?: number; max?: number; mine?: unknown[] } = {}) {
  const prisma = {
    deviceAuthRequest: {
      findUnique: jest.fn().mockResolvedValue(options.existing ?? null),
      findMany: jest.fn().mockResolvedValue(options.mine ?? []),
      count: jest.fn().mockResolvedValue(options.inUse ?? 0),
      create: jest.fn(async ({ data }) => request(data)),
      update: jest.fn(async ({ data }) => request({ ...(options.existing as object), ...data })),
      delete: jest.fn()
    },
    deviceAuthPolicy: { upsert: jest.fn().mockResolvedValue({ maxDevicesPerUser: options.max ?? 1 }) },
    employee: {
      findUnique: jest.fn().mockResolvedValue({ code: "HL-003", fullName: "Lê Minh Khang", avatarUrl: null, department: { name: "Phòng Bán hàng online", parent: { name: "Khối Kinh doanh" } } })
    },
    auditLog: { create: jest.fn() }
  };
  return { service: new DeviceAuthService(prisma as never, { contextFields: () => ({}) } as never), prisma };
}

describe("DeviceAuthService, employee side (DV-05)", () => {
  it("files a pending request with the employee's details and audits it", async () => {
    const { service, prisma } = setup();
    await service.submitMine(me, { deviceId: "web-1234567890", deviceName: " Laptop cá nhân " });
    expect(prisma.deviceAuthRequest.create.mock.calls[0][0].data).toMatchObject({
      employeeId: "e1",
      deviceId: "web-1234567890",
      deviceName: "Laptop cá nhân",
      employeeCode: "HL-003",
      employeeName: "Lê Minh Khang",
      department: "Phòng Bán hàng online",
      branch: "Khối Kinh doanh",
      status: "pending"
    });
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "device_auth.submit", actorId: "e1" });
  });

  it("refuses a device of someone else, a locked device, or one over the limit", async () => {
    await expect(setup({ existing: request({ employeeId: "e9" }) }).service.submitMine(me, { deviceId: "web-1234567890", deviceName: "x" })).rejects.toThrow("người khác");
    await expect(setup({ existing: request({ status: "locked" }) }).service.submitMine(me, { deviceId: "web-1234567890", deviceName: "x" })).rejects.toThrow("khoá");
    await expect(setup({ inUse: 1, max: 1 }).service.submitMine(me, { deviceId: "web-1234567890", deviceName: "x" })).rejects.toBeInstanceOf(ConflictException);
  });

  it("sends a rejected request again, and only renames one already pending", async () => {
    const rejected = setup({ existing: request({ status: "rejected" }) });
    await expect(rejected.service.submitMine(me, { deviceId: "web-1234567890", deviceName: "Máy mới" })).resolves.toMatchObject({ status: "pending", deviceName: "Máy mới" });
    expect(rejected.prisma.deviceAuthRequest.count.mock.calls[0][0].where.id).toEqual({ not: "r1" });

    const pending = setup({ existing: request() });
    await pending.service.submitMine(me, { deviceId: "web-1234567890", deviceName: "Đổi tên" });
    expect(pending.prisma.deviceAuthRequest.update.mock.calls[0][0].data).toEqual({ deviceName: "Đổi tên" });
    expect(pending.prisma.deviceAuthRequest.count).not.toHaveBeenCalled();
  });

  it("lists my devices, marks the current one, and withdraws only an unapproved request of mine", async () => {
    const { service } = setup({ mine: [request(), request({ id: "r2", deviceId: "ios-abcdefgh12", status: "approved" })], max: 2 });
    const result = await service.myDevices(me, "web-1234567890");
    expect(result.maxDevices).toBe(2);
    expect(result.devices.map((device) => [device.id, device.current])).toEqual([["r1", true], ["r2", false]]);

    await expect(setup({ existing: request({ employeeId: "e9" }) }).service.withdrawMine(me, "r1")).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup({ existing: request({ status: "approved" }) }).service.withdrawMine(me, "r1")).rejects.toThrow("nhờ HR");
    const ok = setup({ existing: request() });
    await expect(ok.service.withdrawMine(me, "r1")).resolves.toEqual({ ok: true });
    expect(ok.prisma.deviceAuthRequest.delete).toHaveBeenCalledWith({ where: { id: "r1" } });

    const noProfile = { ...me, account: { ...me.account!, employeeId: null } };
    await expect(setup().service.myDevices(noProfile as AuthenticatedUser)).rejects.toThrow("chưa gắn với hồ sơ");
  });
});
