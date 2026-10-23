import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AttendanceDevicesService } from "./attendance-devices.service";
import { AttendanceService } from "./attendance.service";

const device = (overrides: Record<string, unknown> = {}) => ({
  id: "dev-1",
  deviceId: "VP-01",
  deviceName: "Văn phòng",
  storeCode: null,
  workplaceId: null,
  workplace: null,
  note: null,
  status: "active",
  lastSyncAt: null,
  _count: { rawLogs: 0, syncErrors: 0 },
  ...overrides
});

function setup(stored = device()) {
  const prisma = {
    attendanceDevice: {
      findMany: jest.fn().mockResolvedValue([stored]),
      findUnique: jest.fn().mockResolvedValue(stored),
      create: jest.fn(async ({ data }) => device(data)),
      update: jest.fn(async ({ data }) => device({ ...stored, ...data })),
      delete: jest.fn()
    },
    workplace: { findUnique: jest.fn().mockResolvedValue({ id: "wp-1" }) },
    auditLog: { create: jest.fn() }
  };
  return { service: new AttendanceDevicesService(prisma as never, { contextFields: () => ({}) } as never), prisma };
}

describe("AttendanceDevicesService (AT-19)", () => {
  it("lists devices with their log and error counts", async () => {
    await expect(setup(device({ _count: { rawLogs: 12, syncErrors: 2 } })).service.findAll()).resolves.toEqual([
      expect.objectContaining({ deviceId: "VP-01", logCount: 12, errorCount: 2 })
    ]);
  });

  it("registers a device and reports a duplicate id clearly", async () => {
    const { service, prisma } = setup();
    await expect(service.create({ deviceId: " NGT-01 ", deviceName: "Cửa hàng NGT", workplaceId: "wp-1" })).resolves.toMatchObject({ deviceId: "NGT-01", status: "active" });

    prisma.attendanceDevice.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "7" }));
    await expect(service.create({ deviceId: "VP-01" })).rejects.toBeInstanceOf(ConflictException);
  });

  it("audits turning a device off", async () => {
    const { service, prisma } = setup();
    await service.update("dev-1", { status: "inactive" }, "emp-hr");
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "attendance_device.disable", entityType: "AttendanceDevice", actorId: "emp-hr" });
  });

  it("deletes only a device without logs", async () => {
    await expect(setup(device({ _count: { rawLogs: 3, syncErrors: 0 } })).service.remove("dev-1")).rejects.toThrow("hãy tắt máy");
    const { service, prisma } = setup();
    await expect(service.remove("dev-1")).resolves.toEqual({ id: "dev-1", deleted: true });
    expect(prisma.attendanceDevice.delete).toHaveBeenCalledWith({ where: { id: "dev-1" } });
  });
});

describe("AttendanceService.syncFromDevice with a turned-off device (AT-19)", () => {
  it("refuses the batch and keeps nothing", async () => {
    const prisma = {
      attendanceDevice: { findUnique: jest.fn().mockResolvedValue({ status: "inactive" }), upsert: jest.fn() },
      attendanceRawLog: { create: jest.fn() }
    };
    const calculation = { timezone: jest.fn().mockResolvedValue("Asia/Ho_Chi_Minh") };
    const service = new AttendanceService(prisma as never, calculation as never, {} as never);

    await expect(service.syncFromDevice({ device_id: "VP-01", logs: [{ employee_code: "HL-003", punch_time: "2026-10-20 08:00:00" }] })).rejects.toThrow("đã bị tắt");
    expect(prisma.attendanceDevice.upsert).not.toHaveBeenCalled();
    expect(prisma.attendanceRawLog.create).not.toHaveBeenCalled();
  });
});
