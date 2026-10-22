import { NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ShiftAssignmentsService } from "./shift-assignments.service";

// jose is ESM-only; the permission constants pull the auth guards (and AuthService) into the graph.
jest.mock("jose", () => ({}));

const day = (date: string) => new Date(`${date}T00:00:00.000Z`);
const user = (employeeId: string | null): AuthenticatedUser => ({
  sub: "kc-1",
  roles: [],
  claims: {},
  account: { id: "acc-1", email: "nv@helios.test", displayName: "NV", employeeId, adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
});

const hc = { id: "hc", code: "HC", name: "Hành chính", type: "fixed", color: "#2563eb", startMinute: 480, endMinute: 1020, breakStartMinute: 720, breakEndMinute: 780, requiredMinutes: null, workUnits: 1 };
const sat = { ...hc, id: "sat", code: "T7", name: "Thứ 7 nửa ngày", startMinute: 480, endMinute: 720, breakStartMinute: null, breakEndMinute: null, workUnits: 0.5 };

function setup() {
  const prisma = {
    employee: {
      findUnique: jest.fn().mockResolvedValue({ startDate: new Date("2026-10-21T00:00:00+07:00"), endDate: null, department: { defaultShiftId: null } })
    },
    shiftAssignment: { findMany: jest.fn().mockResolvedValue([{ date: day("2026-10-24"), shiftId: "sat", note: "Trực kho" }]) },
    holiday: { findMany: jest.fn().mockResolvedValue([{ date: day("2026-10-23"), name: "Nghỉ công ty", type: "company_off", paid: true }]) },
    attendancePolicy: { findUnique: jest.fn().mockResolvedValue({ timezone: "Asia/Ho_Chi_Minh", defaultShiftId: "hc", workWeekdays: [1, 2, 3, 4, 5] }) },
    shift: { findMany: jest.fn().mockResolvedValue([hc, sat]) }
  };
  return { service: new ShiftAssignmentsService(prisma as never, {} as never, {} as never), prisma };
}

describe("ShiftAssignmentsService.mySchedule (AT-09)", () => {
  it("lists my shift for each date: default, assignment, holiday, before I started", async () => {
    const { service, prisma } = setup();

    const result = await service.mySchedule(user("emp-1"), { from: "2026-10-20", to: "2026-10-25" });

    expect(prisma.shiftAssignment.findMany.mock.calls[0][0].where.employeeId).toBe("emp-1");
    const byDate = new Map(result.days.map((item) => [item.date, item]));
    expect(byDate.get("2026-10-20")).toMatchObject({ employed: false, shift: null, source: "none" });
    expect(byDate.get("2026-10-21")).toMatchObject({ employed: true, source: "company", shift: { code: "HC", requiredMinutes: 480, workUnits: 1 } });
    expect(byDate.get("2026-10-23")).toMatchObject({ source: "company", holiday: { name: "Nghỉ công ty", type: "company_off" } });
    expect(byDate.get("2026-10-24")).toMatchObject({ source: "assignment", note: "Trực kho", shift: { code: "T7", workUnits: 0.5 } });
    expect(byDate.get("2026-10-25")).toMatchObject({ source: "none", shift: null });
  });

  it("answers clearly for an account without an employee profile", async () => {
    await expect(setup().service.mySchedule(user(null), { from: "2026-10-20", to: "2026-10-25" })).rejects.toBeInstanceOf(NotFoundException);
  });
});
