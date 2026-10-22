import { datesBetween, resolveDayShift } from "./shift-resolver";

const WEEKDAYS = [1, 2, 3, 4, 5];
const MONDAY = "2026-10-19";
const SATURDAY = "2026-10-24";

describe("resolveDayShift (AT-07)", () => {
  it.each([
    ["an assignment wins", { date: MONDAY, assignment: { shiftId: "night" }, departmentDefaultShiftId: "dept", companyDefaultShiftId: "hc" }, { shiftId: "night", source: "assignment" }],
    ["an assigned day off wins too", { date: MONDAY, assignment: { shiftId: null }, companyDefaultShiftId: "hc" }, { shiftId: null, source: "assignment" }],
    ["an assignment works on a weekend", { date: SATURDAY, assignment: { shiftId: "hc" } }, { shiftId: "hc", source: "assignment" }],
    ["department default before company", { date: MONDAY, departmentDefaultShiftId: "dept", companyDefaultShiftId: "hc" }, { shiftId: "dept", source: "department" }],
    ["company default", { date: MONDAY, companyDefaultShiftId: "hc" }, { shiftId: "hc", source: "company" }],
    ["no default at all", { date: MONDAY }, { shiftId: null, source: "none" }],
    ["weekend without assignment", { date: SATURDAY, companyDefaultShiftId: "hc" }, { shiftId: null, source: "none" }],
    ["make-up working day on a Saturday", { date: SATURDAY, companyDefaultShiftId: "hc", holiday: { type: "compensatory_workday" } }, { shiftId: "hc", source: "company" }],
    ["holiday on a weekday still has the shift (the engine pays it)", { date: MONDAY, companyDefaultShiftId: "hc", holiday: { type: "holiday" } }, { shiftId: "hc", source: "company" }]
  ] as const)("%s", (_label, input, expected) => {
    expect(resolveDayShift({ workWeekdays: WEEKDAYS, ...input })).toEqual(expected);
  });

  it("lists every date of a range across a month end", () => {
    expect(datesBetween("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });
});
