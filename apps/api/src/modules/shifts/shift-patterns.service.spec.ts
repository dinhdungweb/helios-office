import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ShiftPatternsService } from "./shift-patterns.service";

function setup(activeShifts = 2) {
  const prisma = {
    shift: { count: jest.fn().mockResolvedValue(activeShifts) },
    shiftPattern: {
      create: jest.fn(async ({ data }) => ({ id: "p1", status: "active", ...data })),
      findUnique: jest.fn().mockResolvedValue({ id: "p1", name: "Cũ", days: ["hc"], status: "active" }),
      update: jest.fn(async ({ data }) => ({ id: "p1", name: "Cũ", days: ["hc"], status: "active", ...data })),
      delete: jest.fn()
    },
    auditLog: { create: jest.fn() }
  };
  return { service: new ShiftPatternsService(prisma as never, { contextFields: () => ({}) } as never), prisma };
}

describe("ShiftPatternsService (AT-08)", () => {
  it("creates a pattern of shifts and days off and audits it", async () => {
    const { service, prisma } = setup();

    await expect(service.create({ name: " Ngày / đêm ", days: ["day", "day", "night", null] }, "emp-hr")).resolves.toMatchObject({
      name: "Ngày / đêm",
      days: ["day", "day", "night", null]
    });
    expect(prisma.shift.count).toHaveBeenCalledWith({ where: { id: { in: ["day", "night"] }, status: "active" } });
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "shift_pattern.create", entityType: "ShiftPattern", actorId: "emp-hr" });
  });

  it("refuses archived shifts and entries that are not a shift or a day off", async () => {
    await expect(setup(1).service.create({ name: "X", days: ["day", "old"] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup().service.create({ name: "X", days: [5 as unknown as string] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("reports a duplicate name clearly", async () => {
    const { service, prisma } = setup();
    prisma.shiftPattern.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "7" }));

    await expect(service.create({ name: "Cũ", days: [null] })).rejects.toBeInstanceOf(ConflictException);
  });

  it("updates only the fields sent", async () => {
    const { service, prisma } = setup();

    await service.update("p1", { name: "Mới" });
    expect(prisma.shiftPattern.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { name: "Mới" } });
  });
});
