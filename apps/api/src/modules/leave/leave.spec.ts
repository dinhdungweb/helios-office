import { BadRequestException } from "@nestjs/common";
import type { Request } from "@prisma/client";
import { RequestTypeRegistry } from "../approvals/engine/request-types";
import { LeaveBalancesService, totalsOf } from "./leave-balances.service";
import { LeaveRequestHandler } from "./leave-request.handler";
import type { LeaveDayShift } from "./leave-rules";

type Row = Record<string, any>;

const office: LeaveDayShift = { startMinute: 480, endMinute: 1020, breakStartMinute: 720, breakEndMinute: 780, requiredMinutes: 480, workUnits: 1, flexible: false };
const weekdays = (date: string) => ([0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()) ? null : office);

const annual = { id: "lt-annual", code: "annual", name: "Nghỉ phép năm", status: "active", paid: true, deductsBalance: true, minUnit: "half_day", maxDaysPerRequest: null, allowDuringProbation: false };
const marriage = { id: "lt-marriage", code: "marriage", name: "Nghỉ kết hôn", status: "active", paid: true, deductsBalance: false, minUnit: "day", maxDaysPerRequest: 3, allowDuringProbation: true };

// In-memory ledger plus the few other tables the leave code reads.
function fakeDb() {
  let seq = 0;
  const db = {
    balances: [] as Row[],
    transactions: [] as Row[],
    requests: [] as Row[],
    periods: [] as Row[],
    employees: [{ id: "staff", startDate: new Date("2023-01-02T00:00:00Z"), endDate: null, officialStartDate: new Date("2023-03-01T00:00:00Z"), status: "active" }] as Row[]
  };
  const key = (where: Row) => where.employeeId_leaveTypeId_year;
  const findBalance = (where: Row) => db.balances.find((row) => row.employeeId === key(where).employeeId && row.leaveTypeId === key(where).leaveTypeId && row.year === key(where).year);
  const client: Row = {
    leaveType: {
      findUnique: async ({ where }: Row) => [annual, marriage].find((item) => item.code === where.code || item.id === where.id) ?? null,
      findUniqueOrThrow: async ({ where }: Row) => [annual, marriage].find((item) => item.code === where.code)!,
      findMany: async () => [annual]
    },
    leaveBalance: {
      upsert: async ({ where, create }: Row) => {
        const existing = findBalance(where);
        if (existing) return existing;
        const row = { id: `bal-${++seq}`, entitled: 0, carriedOver: 0, adjusted: 0, used: 0, pending: 0, expired: 0, carryOverExpiresAt: null, ...create };
        db.balances.push(row);
        return row;
      },
      findUnique: async ({ where }: Row) => findBalance(where) ?? null,
      findMany: async ({ where }: Row) => db.balances.filter((row) => (!where.leaveTypeId || row.leaveTypeId === where.leaveTypeId) && (!where.year?.in || where.year.in.includes(row.year))),
      update: async ({ where, data }: Row) => {
        const row = where.id ? db.balances.find((item) => item.id === where.id)! : findBalance(where)!;
        for (const [field, value] of Object.entries(data)) row[field] = value && typeof value === "object" && "increment" in (value as Row) ? row[field] + (value as Row).increment : value;
        return row;
      }
    },
    leaveBalanceTransaction: {
      findUnique: async ({ where }: Row) => db.transactions.find((row) => row.balanceId === where.balanceId_sourceKey.balanceId && row.sourceKey === where.balanceId_sourceKey.sourceKey) ?? null,
      create: async ({ data }: Row) => db.transactions.push({ id: `tx-${++seq}`, ...data }),
      findMany: async ({ where }: Row) =>
        db.transactions
          .filter((row) => row.requestId === where.requestId && row.field === where.field)
          .map((row) => ({ amount: row.amount, balance: db.balances.find((item) => item.id === row.balanceId) }))
    },
    request: { findMany: async () => db.requests },
    attendancePeriod: { findMany: async ({ where }: Row) => db.periods.filter((row) => where.month.in.includes(row.month) && row.status === "locked") },
    employee: {
      findUnique: async ({ where }: Row) => db.employees.find((row) => row.id === where.id) ?? null,
      findMany: async () => db.employees
    }
  };
  client.$transaction = async (run: (tx: Row) => unknown) => run(client);
  return { client, db };
}

function setup() {
  const { client, db } = fakeDb();
  const balances = new LeaveBalancesService(client as never, { contextFields: () => ({}) } as never, {} as never);
  const schedule = { load: jest.fn().mockResolvedValue(weekdays) };
  const handler = new LeaveRequestHandler(new RequestTypeRegistry(), balances, schedule as never);
  const context = { tx: client as never, requesterId: "staff", actorId: "staff" };
  const give = (days: number, year = 2026) => balances.post(client as never, { employeeId: "staff", leaveTypeId: annual.id, year, field: "entitled", amount: days, kind: "accrual" });
  const balance = (year = 2026) => totalsOf(db.balances.find((row) => row.year === year) as never);
  const asRequest = (payload: unknown, overrides: Row = {}) => ({ id: "req-1", code: "NP-2026-000001", requesterId: "staff", payload, ...overrides }) as Request;
  return { client, db, balances, handler, context, give, balance, asRequest };
}

const range = (fromDate: string, toDate = fromDate, extra: Row = {}) => ({ fromDate, toDate, ...extra });

describe("LeaveRequestHandler", () => {
  it("prepares a request: days by shift, summary and normalised payload", async () => {
    const { handler, context, give } = setup();
    await give(5);

    const { payload, summary } = await handler.prepare({ leaveTypeCode: "annual", ranges: [range("2026-12-04", "2026-12-07")], reason: " Về quê " }, context);

    expect(summary).toMatchObject({ title: "Nghỉ phép năm", subType: "annual", quantity: 2, unit: "day" });
    expect(payload.days.map((day) => day.date)).toEqual(["2026-12-04", "2026-12-07"]);
    expect(payload.reason).toBe("Về quê");
  });

  it.each<[string, Row, string]>([
    ["an unknown type", { leaveTypeCode: "nope", ranges: [range("2026-12-01")] }, "không tồn tại"],
    ["no working day", { leaveTypeCode: "annual", ranges: [range("2026-12-05", "2026-12-06")] }, "không có ngày làm việc"],
    ["too many days for the type", { leaveTypeCode: "marriage", ranges: [range("2026-12-01", "2026-12-04")] }, "tối đa 3 ngày"],
    ["a malformed payload", { leaveTypeCode: "annual", ranges: [] }, "chưa hợp lệ"]
  ])("refuses %s", async (_name, raw, message) => {
    const { handler, context, give } = setup();
    await give(10);
    await expect(handler.prepare(raw, context)).rejects.toThrow(message);
  });

  it("refuses more days than the balance has", async () => {
    const { handler, context, give } = setup();
    await give(1);
    await expect(handler.prepare({ leaveTypeCode: "annual", ranges: [range("2026-12-01", "2026-12-02")] }, context)).rejects.toThrow("còn 1 ngày, đơn cần 2 ngày");
  });

  it("does not check the balance of types that do not use one", async () => {
    const { handler, context } = setup();
    await expect(handler.prepare({ leaveTypeCode: "marriage", ranges: [range("2026-12-01", "2026-12-03")] }, context)).resolves.toBeTruthy();
  });

  it("refuses annual leave during probation", async () => {
    const { handler, context, give, db } = setup();
    await give(5);
    db.employees[0].officialStartDate = new Date("2027-01-01T00:00:00Z");
    await expect(handler.prepare({ leaveTypeCode: "annual", ranges: [range("2026-12-01")] }, context)).rejects.toThrow("thử việc");
  });

  it("refuses dates in a locked attendance month", async () => {
    const { handler, context, give, db } = setup();
    await give(5);
    db.periods.push({ month: "2026-12", status: "locked" });
    await expect(handler.prepare({ leaveTypeCode: "annual", ranges: [range("2026-12-01")] }, context)).rejects.toThrow("đã chốt");
  });

  it("refuses a day another leave request already covers, but allows the other half", async () => {
    const { handler, context, give, db } = setup();
    await give(5);
    db.requests.push({ code: "NP-2026-000009", payload: { days: [{ date: "2026-12-01", minutes: 240, units: 0.5 }] } });

    await expect(handler.prepare({ leaveTypeCode: "annual", ranges: [range("2026-12-01")] }, context)).rejects.toThrow("NP-2026-000009");
    await expect(handler.prepare({ leaveTypeCode: "annual", ranges: [range("2026-12-01", "2026-12-01", { fromTime: "13:00", toTime: "17:00" })] }, context)).resolves.toBeTruthy();
  });

  it("reserves on submit, moves to used on approval, refunds when HR cancels", async () => {
    const { handler, context, give, balance, asRequest } = setup();
    await give(5);
    const { payload } = await handler.prepare({ leaveTypeCode: "annual", ranges: [range("2026-12-01", "2026-12-02")] }, context);
    const request = asRequest(payload);

    await handler.onSubmitted(request, context);
    expect(balance()).toMatchObject({ entitled: 5, pending: 2, used: 0 });

    await handler.onApproved(request, context);
    expect(balance()).toMatchObject({ pending: 0, used: 2 });

    await handler.onCancelledAfterApproval(request, context);
    expect(balance()).toMatchObject({ pending: 0, used: 0 });
  });

  it("releases the reservation when the request is withdrawn", async () => {
    const { handler, context, give, balance, asRequest } = setup();
    await give(5);
    const { payload } = await handler.prepare({ leaveTypeCode: "annual", ranges: [range("2026-12-01")] }, context);
    const request = asRequest(payload);

    await handler.onSubmitted(request, context);
    await handler.onWithdrawn(request, context);
    await handler.onWithdrawn(request, context);
    expect(balance()).toMatchObject({ pending: 0, used: 0 });
  });

  it("charges each year's balance for a request over New Year", async () => {
    const { handler, context, give, balance, asRequest } = setup();
    await give(5, 2026);
    await give(5, 2027);
    const { payload } = await handler.prepare({ leaveTypeCode: "annual", ranges: [range("2026-12-31", "2027-01-01")] }, context);

    await handler.onSubmitted(asRequest(payload), context);
    expect(balance(2026).pending).toBe(1);
    expect(balance(2027).pending).toBe(1);
  });

  it("exposes leave fields to workflow conditions", async () => {
    const { handler, context, give, asRequest } = setup();
    await give(5);
    const { payload } = await handler.prepare({ leaveTypeCode: "annual", ranges: [range("2026-12-01", "2026-12-03")] }, context);
    expect(handler.conditionRecord(asRequest(payload))).toEqual({ total_days: 3, leave_type: "annual", paid: true, deducts_balance: true });
    expect(handler.affectedDates(asRequest(payload))).toEqual(["2026-12-01", "2026-12-02", "2026-12-03"]);
  });
});

describe("LeaveBalancesService", () => {
  it("writes a sourceKey entry once", async () => {
    const { balances, client, db } = setup();
    const entry = { employeeId: "staff", leaveTypeId: annual.id, year: 2026, field: "entitled" as const, amount: 1, kind: "accrual", sourceKey: "accrual:2026-01" };
    expect(await balances.post(client as never, entry)).toBe(true);
    expect(await balances.post(client as never, entry)).toBe(false);
    expect(db.transactions).toHaveLength(1);
  });

  it("accrues the month, carries last year over and expires unused carried days", async () => {
    const { balances, give, balance, db } = setup();
    await give(10, 2025);

    await balances.tick(new Date("2026-02-10T03:00:00Z"));
    expect(balance(2026)).toMatchObject({ entitled: 2, carriedOver: 10, expired: 0 });
    expect(db.balances.find((row) => row.year === 2026)?.carryOverExpiresAt?.toISOString().slice(0, 10)).toBe("2026-03-31");

    await balances.tick(new Date("2026-02-20T03:00:00Z"));
    expect(balance(2026)).toMatchObject({ entitled: 2, carriedOver: 10 });

    db.balances.find((row) => row.year === 2026)!.used = 4;
    await balances.tick(new Date("2026-04-01T03:00:00Z"));
    expect(balance(2026)).toMatchObject({ entitled: 4, carriedOver: 10, expired: 6 });
  });

  it("refuses an adjustment without a reason", async () => {
    const { balances } = setup();
    await expect(balances.adjust({ account: { employeeId: "hr" } } as never, { employeeId: "staff", leaveTypeId: annual.id, year: 2026, amount: 1, reason: " " })).rejects.toThrow(BadRequestException);
  });
});
