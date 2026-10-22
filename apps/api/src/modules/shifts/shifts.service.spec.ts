import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ShiftsService } from "./shifts.service";

const storedShift = (overrides: Record<string, unknown> = {}) => ({
  id: "shift-1",
  code: "HC",
  name: "Hành chính",
  type: "fixed",
  color: null,
  startMinute: 480,
  endMinute: 1020,
  breakStartMinute: 720,
  breakEndMinute: 780,
  requiredMinutes: 480,
  workUnits: new Prisma.Decimal(1),
  lateGraceMinutes: null,
  earlyGraceMinutes: null,
  lateCountMode: null,
  missingPunchMode: null,
  punchWindowBeforeMinutes: null,
  punchWindowAfterMinutes: null,
  description: null,
  status: "active",
  archivedAt: null,
  _count: { departmentsDefault: 0, policiesDefault: 0 },
  ...overrides
});

function setup(shift = storedShift()) {
  const prisma = {
    shift: {
      findMany: jest.fn().mockResolvedValue([shift]),
      findUnique: jest.fn().mockResolvedValue(shift),
      create: jest.fn(async ({ data }) => ({ ...storedShift(), ...data, workUnits: new Prisma.Decimal(data.workUnits) })),
      update: jest.fn(async ({ data }) => ({ ...shift, ...data })),
      delete: jest.fn()
    },
    attendancePolicy: {
      upsert: jest.fn().mockResolvedValue({ id: "default", defaultShiftId: "shift-1" }),
      update: jest.fn(async ({ data }) => ({ id: "default", ...data }))
    },
    auditLog: { create: jest.fn() }
  };
  const service = new ShiftsService(prisma as never, { contextFields: () => ({}) } as never);
  return { service, prisma };
}

describe("ShiftsService (AT-05, AT-06)", () => {
  it("creates a night shift, upper-cases the code and stores its required minutes", async () => {
    const { service, prisma } = setup();

    const view = await service.create({ code: "cd", name: "Ca đêm", startMinute: 1320, endMinute: 360 });

    expect(prisma.shift.create.mock.calls[0][0].data).toMatchObject({ code: "CD", type: "fixed", requiredMinutes: 480, workUnits: 1 });
    expect(view).toMatchObject({ code: "CD", requiredMinutes: 480, workUnits: 1 });
    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe("shift.create");
  });

  it("refuses invalid times with the reason", async () => {
    const { service, prisma } = setup();

    await expect(
      service.create({ code: "X", name: "Sai", startMinute: 480, endMinute: 1020, breakStartMinute: 1080, breakEndMinute: 1110 })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shift.create).not.toHaveBeenCalled();
  });

  it("validates an update against the stored shift merged with the change", async () => {
    const { service } = setup();

    // Moving only the end before the stored break makes the break fall outside the shift.
    await expect(service.update("shift-1", { endMinute: 700 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update("shift-1", { name: "Hành chính mới" })).resolves.toMatchObject({ name: "Hành chính mới" });
  });

  it("keeps a company or department default from being archived or deleted", async () => {
    const used = setup(storedShift({ _count: { departmentsDefault: 1, policiesDefault: 0 } }));

    await expect(used.service.archive("shift-1")).rejects.toBeInstanceOf(ConflictException);
    await expect(used.service.remove("shift-1")).rejects.toBeInstanceOf(ConflictException);
    expect(used.prisma.shift.delete).not.toHaveBeenCalled();

    const unused = setup();
    await expect(unused.service.remove("shift-1")).resolves.toEqual({ id: "shift-1", deleted: true });
  });

  it("refuses to edit an archived shift", async () => {
    await expect(setup(storedShift({ status: "archived" })).service.update("shift-1", { name: "X" })).rejects.toBeInstanceOf(ConflictException);
  });

  it("checks the time zone and default shift of the policy, and sorts weekdays", async () => {
    const { service, prisma } = setup();

    await expect(service.updatePolicy({ timezone: "Mars/Olympus" })).rejects.toBeInstanceOf(BadRequestException);

    prisma.shift.findUnique.mockResolvedValueOnce(storedShift({ status: "archived" }));
    await expect(service.updatePolicy({ defaultShiftId: "shift-1" })).rejects.toBeInstanceOf(BadRequestException);

    await service.updatePolicy({ workWeekdays: [6, 1, 3], lateGraceMinutes: 10 });
    expect(prisma.attendancePolicy.update.mock.calls[0][0].data).toEqual({ workWeekdays: [1, 3, 6], lateGraceMinutes: 10 });
    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe("attendance_policy.update");
  });
});
