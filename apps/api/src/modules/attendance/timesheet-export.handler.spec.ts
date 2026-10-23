import { BadRequestException } from "@nestjs/common";
import { TimesheetExportHandler } from "./timesheet-export.handler";

const cell = (date: string, overrides: Record<string, unknown> = {}) => ({
  date,
  id: null,
  status: null,
  shiftCode: "HC",
  shiftColor: null,
  checkIn: null,
  checkOut: null,
  workedMinutes: 0,
  workUnits: 0,
  paidLeaveUnits: 0,
  lateMinutes: 0,
  earlyMinutes: 0,
  outsideShiftMinutes: 0,
  adjusted: false,
  needsExplanation: false,
  ...overrides
});

const month = {
  month: "2026-02",
  dates: [
    { date: "2026-02-02", weekday: 1, holiday: null },
    { date: "2026-02-03", weekday: 2, holiday: null },
    { date: "2026-02-07", weekday: 6, holiday: null },
    { date: "2026-02-16", weekday: 1, holiday: { name: "Tết", type: "holiday" } }
  ],
  items: [
    {
      employee: { id: "e1", code: "HL-003", fullName: "Khang", department: { id: "d1", name: "Bán hàng" } },
      confirmation: { status: "feedback" },
      cells: [
        cell("2026-02-02", {
          id: "r1",
          status: "late",
          workedMinutes: 468,
          workUnits: 0.98,
          lateMinutes: 12,
          checkIn: new Date("2026-02-02T08:12:00+07:00"),
          checkOut: new Date("2026-02-02T17:00:00+07:00"),
          adjusted: true
        }),
        cell("2026-02-03", { id: "r2", status: "absent" }),
        cell("2026-02-07", { shiftCode: null }),
        cell("2026-02-16", { id: "r3", status: "holiday", paidLeaveUnits: 1 })
      ],
      totals: { lateCount: 1, lateMinutes: 12, totalUnits: 1.98 }
    }
  ]
};

function setup() {
  const timesheets = { fullMonth: jest.fn().mockResolvedValue(month) };
  const handler = new TimesheetExportHandler(timesheets as never, { registerExport: jest.fn() } as never);
  return { handler, timesheets };
}

describe("TimesheetExportHandler (AT-18)", () => {
  it("validates the month and an optional department", () => {
    const { handler } = setup();
    expect(handler.parseParams({ month: "2026-02", departmentId: "d1" })).toEqual({ month: "2026-02", departmentId: "d1" });
    expect(() => handler.parseParams({ month: "02-2026" })).toThrow(BadRequestException);
    expect(handler.fileName({ month: "2026-02" })).toBe("bang-cham-cong-2026-02.xlsx");
  });

  it("writes the month with one column per day and a sheet of days", async () => {
    const { handler, timesheets } = setup();
    const scope = { level: "company" as const };

    const [monthSheet, detailSheet] = await handler.sheets({ month: "2026-02" }, { accountId: "acc-1", employeeId: null, scope });

    expect(timesheets.fullMonth).toHaveBeenCalledWith(scope, { month: "2026-02" });
    expect(monthSheet.title).toBe("Bảng công 02-2026");
    expect(monthSheet.columns.map((column) => column.header).slice(4, 8)).toEqual(["02 T2", "03 T3", "07 T7", "16 T2"]);
    expect(monthSheet.rows[0]).toMatchObject({ index: 1, code: "HL-003", d02: 7.8, d03: "X", d07: "N", d16: "L", lateMinutes: 12, totalUnits: 1.98, confirmation: "Có phản hồi" });

    expect(detailSheet.rows).toHaveLength(3);
    expect(detailSheet.rows[0]).toMatchObject({ code: "HL-003", weekday: "T2", shift: "HC", checkIn: "08:12", checkOut: "17:00", status: "Đi muộn", lateMinutes: 12, workedHours: 7.8, adjusted: "Có" });
    expect(detailSheet.rows[2]).toMatchObject({ status: "Nghỉ lễ", holidayUnits: 1 });
  });
});
