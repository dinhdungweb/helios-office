import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { HolidaysService, parseCalendarDate } from "./holidays.service";

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: "h-1",
  date: new Date("2026-02-17T00:00:00.000Z"),
  name: "Tết Nguyên đán",
  type: "holiday",
  paid: true,
  note: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

function setup() {
  const prisma = {
    holiday: {
      findMany: jest.fn().mockResolvedValue([stored()]),
      findUnique: jest.fn().mockResolvedValue(stored()),
      create: jest.fn(async ({ data }) => stored(data)),
      update: jest.fn(async ({ data }) => stored(data)),
      delete: jest.fn(),
      createMany: jest.fn().mockResolvedValue({ count: 3 })
    },
    auditLog: { create: jest.fn() }
  };
  const recalc = { scheduleChanged: jest.fn(), holidaysChanged: jest.fn(), rulesChanged: jest.fn() };
  return { service: new HolidaysService(prisma as never, { contextFields: () => ({}) } as never, recalc as never), prisma, recalc };
}

describe("HolidaysService (AT-10)", () => {
  it("keeps holidays as calendar dates and refuses impossible ones", () => {
    expect(parseCalendarDate("2026-02-17").toISOString()).toBe("2026-02-17T00:00:00.000Z");
    expect(() => parseCalendarDate("2026-02-30")).toThrow(BadRequestException);
  });

  it("lists one year and returns dates as YYYY-MM-DD", async () => {
    const { service, prisma } = setup();

    await expect(service.findByYear(2026)).resolves.toEqual([expect.objectContaining({ date: "2026-02-17" })]);
    expect(prisma.holiday.findMany.mock.calls[0][0].where.date).toEqual({
      gte: new Date("2026-01-01T00:00:00.000Z"),
      lte: new Date("2026-12-31T00:00:00.000Z")
    });
  });

  it("never marks a make-up working day as paid", async () => {
    const { service, prisma } = setup();

    await service.create({ date: "2026-05-09", name: "Làm bù 30/4", type: "compensatory_workday", paid: true });

    expect(prisma.holiday.create.mock.calls[0][0].data).toMatchObject({ type: "compensatory_workday", paid: false });
    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe("holiday.create");
  });

  it("refuses a second entry for the same date", async () => {
    const { service, prisma } = setup();
    prisma.holiday.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "7" }));

    await expect(service.create({ date: "2026-02-17", name: "Trùng" })).rejects.toBeInstanceOf(ConflictException);
  });

  it("updates on top of the stored entry", async () => {
    const { service, prisma } = setup();

    await service.update("h-1", { name: "Mùng 1 Tết" });

    expect(prisma.holiday.update.mock.calls[0][0].data).toMatchObject({ name: "Mùng 1 Tết", date: new Date("2026-02-17T00:00:00.000Z"), paid: true });
  });

  it("adds the four fixed solar holidays of a year without touching existing dates, then recalculates them", async () => {
    const { service, prisma, recalc } = setup();

    await expect(service.addFixedHolidays(2028)).resolves.toEqual({ year: 2028, added: 3 });

    const call = prisma.holiday.createMany.mock.calls[0][0];
    expect(call.skipDuplicates).toBe(true);
    expect(call.data.map((holiday: { date: Date }) => holiday.date.toISOString().slice(0, 10))).toEqual([
      "2028-01-01",
      "2028-04-30",
      "2028-05-01",
      "2028-09-02"
    ]);
    expect(recalc.holidaysChanged).toHaveBeenCalledWith(["2028-01-01", "2028-04-30", "2028-05-01", "2028-09-02"], undefined);
  });
});
