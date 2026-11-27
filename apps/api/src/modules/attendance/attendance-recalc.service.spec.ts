import { AttendanceRecalcService, monthChunks } from "./attendance-recalc.service";

const day = (date: string) => new Date(`${date}T00:00:00.000Z`);

function setup(options: { queueFails?: boolean; calcFails?: boolean } = {}) {
  const rows = new Map<string, Record<string, unknown>>();
  const prisma = {
    attendanceRecalcJob: {
      create: jest.fn(async ({ data }) => {
        const row = { id: `job-${rows.size + 1}`, status: "queued", result: null, error: null, createdAt: new Date(), startedAt: null, finishedAt: null, ...data };
        rows.set(row.id, row);
        return row;
      }),
      findUnique: jest.fn(async ({ where }) => rows.get(where.id) ?? null),
      update: jest.fn(async ({ where, data }) => {
        const row = { ...rows.get(where.id)!, ...data };
        rows.set(where.id, row);
        return row;
      }),
      findMany: jest.fn(async () => [...rows.values()])
    }
  };
  const queue = {
    add: jest.fn(async () => {
      if (options.queueFails) throw new Error("Redis is unavailable");
      return { id: "bull-1" };
    })
  };
  const calculation = {
    timezone: jest.fn().mockResolvedValue("Asia/Ho_Chi_Minh"),
    recalculate: jest.fn<Promise<{ days: number; changed: number; removed: number }>, [{ from: string; to: string }]>(async () => {
      if (options.calcFails) throw new Error("boom");
      return { days: 10, changed: 2, removed: 0 };
    })
  };
  const service = new AttendanceRecalcService(prisma as never, queue as never, calculation as never);
  return { service, prisma, queue, calculation, rows };
}

describe("AttendanceRecalcService (AT-12)", () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date("2026-10-22T10:00:00+07:00"), doNotFake: ["nextTick", "setImmediate"] }));
  afterEach(() => jest.useRealTimers());

  it("splits a range into calendar months", () => {
    expect(monthChunks("2026-09-15", "2026-11-03")).toEqual([
      { from: "2026-09-15", to: "2026-09-30" },
      { from: "2026-10-01", to: "2026-10-31" },
      { from: "2026-11-01", to: "2026-11-03" }
    ]);
  });

  it("runs a small request at once, month by month, and records the result", async () => {
    const { service, queue, calculation } = setup();

    const job = await service.request({ from: "2026-09-29", to: "2026-10-02", employeeIds: ["e1", "e2"], reason: "schedule", requestedById: "emp-hr" });

    expect(queue.add).not.toHaveBeenCalled();
    expect(calculation.recalculate.mock.calls.map(([options]) => [options.from, options.to])).toEqual([
      ["2026-09-29", "2026-09-30"],
      ["2026-10-01", "2026-10-02"]
    ]);
    expect(job).toMatchObject({ status: "done", employees: 2, reason: "schedule", result: { days: 20, changed: 4, removed: 0 } });
  });

  it("queues a large request and stops at today", async () => {
    const { service, queue, prisma } = setup();

    const job = await service.request({ from: "2026-10-01", to: "2026-12-31", reason: "policy" });

    expect(prisma.attendanceRecalcJob.create.mock.calls[0][0].data.to).toEqual(day("2026-10-22"));
    expect(queue.add).toHaveBeenCalledWith("attendance-recalc", "policy", { jobId: "job-1" }, { jobId: "job-1" });
    expect(job).toMatchObject({ status: "queued", employees: null, to: "2026-10-22" });
  });

  it("does nothing for dates that have not come yet", async () => {
    const { service, prisma } = setup();
    await expect(service.request({ from: "2026-11-01", to: "2026-11-30", employeeIds: ["e1"], reason: "schedule" })).resolves.toBeNull();
    expect(prisma.attendanceRecalcJob.create).not.toHaveBeenCalled();
  });

  it("runs in the API process when Redis is down", async () => {
    const { service, calculation, rows } = setup({ queueFails: true });

    await service.request({ from: "2026-10-01", to: "2026-10-22", reason: "holiday" });
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(calculation.recalculate).toHaveBeenCalledWith({ from: "2026-10-01", to: "2026-10-22", employeeIds: undefined, source: "recalculation" });
    expect(rows.get("job-1")).toMatchObject({ status: "done" });
  });

  it("marks a failed job and returns it instead of throwing", async () => {
    const { service } = setup({ calcFails: true });

    await expect(service.request({ from: "2026-10-20", to: "2026-10-21", employeeIds: ["e1"], reason: "manual" })).resolves.toMatchObject({ status: "failed", error: "boom" });
  });

  it("recalculates from the start of last month after a rules change", async () => {
    const { service, queue, prisma } = setup();

    await service.rulesChanged("policy", "emp-hr");

    expect(prisma.attendanceRecalcJob.create.mock.calls[0][0].data).toMatchObject({ from: day("2026-09-01"), to: day("2026-10-22"), reason: "policy", requestedById: "emp-hr" });
    expect(queue.add).toHaveBeenCalled();
  });

  it("never lets a trigger fail the change that caused it", async () => {
    const { service, calculation } = setup();
    calculation.timezone.mockRejectedValue(new Error("db down"));

    await expect(service.scheduleChanged(["e1"], ["2026-10-20"])).resolves.toBeNull();
    await expect(service.holidaysChanged(["2026-10-20"])).resolves.toBeNull();
    await expect(service.rulesChanged("shift")).resolves.toBeNull();
  });
});
