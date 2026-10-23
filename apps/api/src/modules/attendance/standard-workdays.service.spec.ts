import { ConflictException } from "@nestjs/common";
import { daysWithoutSundays, overlaps, pickRule, standardFor, type StandardRule } from "./engine/standard-workdays";
import { StandardWorkdayService } from "./standard-workdays.service";

const rule = (overrides: Partial<StandardRule>): StandardRule => ({
  id: "r",
  name: "Nhóm",
  departmentIds: [],
  positionIds: [],
  mode: "auto",
  fixedUnits: null,
  adjustUnits: 0,
  effectiveFrom: "2026-01",
  ...overrides
});

describe("standard work units (AT-25)", () => {
  it("counts days minus Sundays like 1Office's TOTAL_DAY-TOTAL_SUNDAY", () => {
    expect(daysWithoutSundays("2026-10")).toBe(27); // 31 days, Sundays 4, 11, 18, 25
    expect(daysWithoutSundays("2026-02")).toBe(24);
    expect(standardFor(rule({ adjustUnits: -1 }), "2026-10", { units: 22, minutes: 0 }, 8)).toEqual({ units: 26, hours: 208, mode: "auto", ruleId: "r", ruleName: "Nhóm" });
    expect(standardFor(rule({ mode: "fixed", fixedUnits: 24 }), "2026-10", { units: 22, minutes: 0 }, 8).units).toBe(24);
    expect(standardFor(null, "2026-10", { units: 22, minutes: 22 * 480 }, 8)).toMatchObject({ units: 22, hours: 176, mode: "schedule", ruleId: null });
  });

  it("picks the most specific rule, then the latest start month, never a future one", () => {
    const rules = [
      rule({ id: "all", effectiveFrom: "2026-01" }),
      rule({ id: "all-new", effectiveFrom: "2026-09" }),
      rule({ id: "pos", positionIds: ["p1"] }),
      rule({ id: "dep", departmentIds: ["d1"] }),
      rule({ id: "dep-pos", departmentIds: ["d1"], positionIds: ["p1"] }),
      rule({ id: "future", departmentIds: ["d1"], positionIds: ["p1"], effectiveFrom: "2027-01" })
    ];
    expect(pickRule(rules, { departmentId: "d1", positionId: "p1" }, "2026-10")?.id).toBe("dep-pos");
    expect(pickRule(rules, { departmentId: "d1", positionId: null }, "2026-10")?.id).toBe("dep");
    expect(pickRule(rules, { departmentId: "d2", positionId: "p1" }, "2026-10")?.id).toBe("pos");
    expect(pickRule(rules, { departmentId: "d2", positionId: null }, "2026-10")?.id).toBe("all-new");
    expect(pickRule(rules, { departmentId: "d2", positionId: null }, "2026-05")?.id).toBe("all");
    expect(pickRule(rules.slice(2), { departmentId: "d2", positionId: null }, "2026-10")).toBeNull();
  });

  it("treats equally specific rules for a shared group and month as a clash", () => {
    expect(overlaps(rule({ departmentIds: ["d1", "d2"] }), rule({ departmentIds: ["d2"] }))).toBe(true);
    expect(overlaps(rule({ departmentIds: ["d1"] }), rule({ departmentIds: ["d2"] }))).toBe(false);
    expect(overlaps(rule({ departmentIds: ["d1"] }), rule({ departmentIds: ["d1"], effectiveFrom: "2026-02" }))).toBe(false);
    expect(overlaps(rule({ departmentIds: ["d1"] }), rule({ departmentIds: ["d1"], positionIds: ["p1"] }))).toBe(false);
    expect(overlaps(rule({}), rule({}))).toBe(true);
  });
});

describe("StandardWorkdayService (AT-25)", () => {
  function setup(options: { locked?: string; others?: unknown[] } = {}) {
    const prisma = {
      standardWorkdayRule: {
        findMany: jest.fn().mockResolvedValue(options.others ?? []),
        findUnique: jest.fn().mockResolvedValue({ id: "r1", name: "Cũ", departmentIds: [], positionIds: [], mode: "auto", fixedUnits: null, adjustUnits: 0, effectiveFrom: "2026-12" }),
        create: jest.fn(async ({ data }) => ({ id: "new", ...data, adjustUnits: data.adjustUnits ?? 0 })),
        update: jest.fn(),
        delete: jest.fn()
      },
      department: { count: jest.fn().mockResolvedValue(1) },
      jobPosition: { count: jest.fn().mockResolvedValue(0) },
      attendancePeriod: { findFirst: jest.fn().mockResolvedValue(options.locked ? { month: options.locked } : null) },
      auditLog: { create: jest.fn() }
    };
    return { service: new StandardWorkdayService(prisma as never, { contextFields: () => ({}) } as never), prisma };
  }
  const input = { name: " Khối văn phòng ", departmentIds: ["d1", "d1"], mode: "auto" as const, adjustUnits: -1, effectiveFrom: "2026-11" };

  it("saves a rule and audits it", async () => {
    const { service, prisma } = setup();
    await expect(service.create(input, "emp-hr")).resolves.toMatchObject({ name: "Khối văn phòng", departmentIds: ["d1"], adjustUnits: -1 });
    expect(prisma.attendancePeriod.findFirst.mock.calls[0][0].where).toEqual({ status: "locked", month: { gte: "2026-11" } });
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "standard_workday.create", actorId: "emp-hr" });
  });

  it("refuses a change reaching a locked month, a clash, or a fixed rule without a number", async () => {
    await expect(setup({ locked: "2026-11" }).service.create(input)).rejects.toThrow("Kỳ công tháng 11/2026 đã chốt");
    const clash = { id: "x", name: "Văn phòng cũ", departmentIds: ["d1"], positionIds: [], mode: "fixed", fixedUnits: 26, adjustUnits: 0, effectiveFrom: "2026-11" };
    await expect(setup({ others: [clash] }).service.create(input)).rejects.toBeInstanceOf(ConflictException);
    await expect(setup().service.create({ ...input, mode: "fixed" })).rejects.toThrow("Nhập số công chuẩn cố định");
    // Moving a rule later still checks from where it applied before.
    const moved = setup({ locked: "2026-12" });
    await expect(moved.service.update("r1", { ...input, effectiveFrom: "2027-01" })).rejects.toThrow("12/2026");
  });
});
