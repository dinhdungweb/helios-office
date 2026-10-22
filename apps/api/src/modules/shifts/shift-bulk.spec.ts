import { planBulkCells, previewBulk, shiftForDate, type BulkRule } from "./shift-bulk";

const employee = (id: string, startDate = "2020-01-01", endDate: string | null = null) => ({ id, startDate, endDate });

describe("planBulkCells (AT-08)", () => {
  it("repeats a two-week pattern over three months from the first date", () => {
    // Week 1: day shift Mon–Fri, weekend off. Week 2: night shift Mon–Fri, weekend off.
    const week = (shift: string) => [shift, shift, shift, shift, shift, null, null];
    const rule: BulkRule = { kind: "pattern", days: [...week("day"), ...week("night")], anchor: "2026-11-02" };

    const cells = planBulkCells([employee("e1")], "2026-11-02", "2027-01-31", rule);

    expect(cells).toHaveLength(91);
    const byDate = new Map(cells.map((cell) => [cell.date, cell.shiftId]));
    expect(byDate.get("2026-11-02")).toBe("day"); // Monday, week 1
    expect(byDate.get("2026-11-07")).toBeNull(); // Saturday off
    expect(byDate.get("2026-11-09")).toBe("night"); // Monday, week 2
    expect(byDate.get("2026-11-16")).toBe("day"); // the cycle starts again
    expect(byDate.get("2027-01-18")).toBe("night"); // 11 weeks later: week 2 of the cycle
    expect(byDate.get("2027-01-25")).toBe("day"); // 12 weeks later: week 1 again
    expect(cells.filter((cell) => cell.shiftId === "day")).toHaveLength(35);
    expect(cells.filter((cell) => cell.shiftId === "night")).toHaveLength(30);
  });

  it("puts one shift on the chosen weekdays only", () => {
    const rule: BulkRule = { kind: "shift", shiftId: "sat", weekdays: [6] };
    const cells = planBulkCells([employee("e1"), employee("e2")], "2026-11-01", "2026-11-30", rule);

    expect(cells.map((cell) => cell.date)).toEqual(["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28", "2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28"]);
    expect(shiftForDate({ kind: "shift", shiftId: null, weekdays: [] }, "2026-11-01")).toEqual({ skip: false, shiftId: null });
  });

  it("continues a pattern backwards before its anchor", () => {
    expect(shiftForDate({ kind: "pattern", days: ["a", "b", "c"], anchor: "2026-11-10" }, "2026-11-09")).toEqual({ skip: false, shiftId: "c" });
  });

  it("skips dates outside each person's employment", () => {
    const cells = planBulkCells([employee("new", "2026-11-04"), employee("leaving", "2020-01-01", "2026-11-02")], "2026-11-01", "2026-11-05", {
      kind: "shift",
      shiftId: "hc",
      weekdays: []
    });

    expect(cells.map((cell) => `${cell.employeeId} ${cell.date}`)).toEqual([
      "new 2026-11-04",
      "new 2026-11-05",
      "leaving 2026-11-01",
      "leaving 2026-11-02"
    ]);
  });

  it("previews new, changed and unchanged cells", () => {
    const cells = [
      { employeeId: "e1", date: "2026-11-02", shiftId: "hc" },
      { employeeId: "e1", date: "2026-11-03", shiftId: "hc" },
      { employeeId: "e1", date: "2026-11-04", shiftId: null }
    ];
    const existing = new Map<string, string | null>([["e1:2026-11-03", "hc"], ["e1:2026-11-04", "night"]]);

    expect(previewBulk(cells, existing)).toEqual({ cells: 3, create: 1, overwrite: 1, unchanged: 1 });
  });
});
