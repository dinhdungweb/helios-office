import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AttendanceRecalcStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ATTENDANCE_RECALC_QUEUE } from "../../common/queue/queue.constants";
import { QueueService } from "../../common/queue/queue.service";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import { addDays, localDate } from "./engine/zoned-time";

// AT-12: requests to recompute AttendanceDay, by HR or after a change that moves results
// (design §6.5). Each request is a row in AttendanceRecalcJob so HR can follow it. Small ones run
// inside the request; larger ones go to the attendance-recalc queue, or run in the background here
// when Redis is down. Periods locked by AT-17 will be skipped here once locking exists.

// "request": an approved / cancelled request changed leave or other adjustments (AT-22).
export type RecalcReason = "manual" | "schedule" | "holiday" | "policy" | "shift" | "department_default" | "request";

export type RecalcRequest = {
  from: string;
  to: string;
  // Omitted: everyone employed in the range.
  employeeIds?: string[];
  reason: RecalcReason;
  requestedById?: string;
};

export type RecalcJobData = { jobId: string };

// People × days small enough to compute while the user waits.
const INLINE_CELLS = 400;

const dbDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
const isoDate = (value: Date) => value.toISOString().slice(0, 10);

export function monthChunks(from: string, to: string) {
  const chunks: Array<{ from: string; to: string }> = [];
  for (let start = from; start <= to; ) {
    const nextMonth = `${addDays(`${start.slice(0, 7)}-01`, 31).slice(0, 7)}-01`;
    const end = addDays(nextMonth, -1) < to ? addDays(nextMonth, -1) : to;
    chunks.push({ from: start, to: end });
    start = addDays(end, 1);
  }
  return chunks;
}

@Injectable()
export class AttendanceRecalcService {
  private readonly logger = new Logger(AttendanceRecalcService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly calculation: AttendanceCalculationService
  ) {}

  // Records the request and runs or queues it. Returns null when nothing is left to compute
  // (only future dates, or nobody).
  async request(input: RecalcRequest) {
    const timeZone = await this.calculation.timezone();
    const today = localDate(Date.now(), timeZone);
    const to = input.to < today ? input.to : today;
    if (input.from > to || (input.employeeIds && input.employeeIds.length === 0)) return null;

    const job = await this.prisma.attendanceRecalcJob.create({
      data: {
        from: dbDate(input.from),
        to: dbDate(to),
        employeeIds: input.employeeIds ?? Prisma.DbNull,
        reason: input.reason,
        requestedById: input.requestedById ?? null
      }
    });

    const days = monthChunks(input.from, to).reduce((total, chunk) => total + (Date.parse(chunk.to) - Date.parse(chunk.from)) / 86_400_000 + 1, 0);
    if (input.employeeIds && input.employeeIds.length * days <= INLINE_CELLS) {
      // A failure is recorded on the job, which is what the caller gets back.
      await this.run(job.id).catch(() => undefined);
      return this.find(job.id);
    }

    try {
      await this.queue.add<RecalcJobData>(ATTENDANCE_RECALC_QUEUE, input.reason, { jobId: job.id }, { jobId: job.id });
    } catch (error) {
      this.logger.warn(`Queue unavailable, recalculating ${job.id} in the API process: ${error instanceof Error ? error.message : error}`);
      void this.run(job.id).catch(() => undefined);
    }
    return this.view(job);
  }

  // The triggers below follow a change that is already saved: a failure to recalculate is logged
  // and left for HR to rerun, never turned into an error for that change.

  // After schedule edits: those people, from the earliest to the latest changed date.
  scheduleChanged(employeeIds: string[], dates: string[], requestedById?: string) {
    if (employeeIds.length === 0 || dates.length === 0) return Promise.resolve(null);
    const sorted = [...dates].sort();
    return this.safely(() => this.request({ from: sorted[0], to: sorted[sorted.length - 1], employeeIds, reason: "schedule", requestedById }));
  }

  // After holidays are added, changed or removed: everyone, on those dates.
  holidaysChanged(dates: string[], requestedById?: string) {
    if (dates.length === 0) return Promise.resolve(null);
    const sorted = [...dates].sort();
    return this.safely(() => this.request({ from: sorted[0], to: sorted[sorted.length - 1], reason: "holiday", requestedById }));
  }

  // After policy, shift or default-shift changes: every open day. Until periods can be locked
  // (AT-17) that is the current and the previous month.
  rulesChanged(reason: RecalcReason, requestedById?: string, employeeIds?: string[]) {
    return this.safely(async () => {
      const today = localDate(Date.now(), await this.calculation.timezone());
      const from = `${addDays(`${today.slice(0, 7)}-01`, -1).slice(0, 7)}-01`;
      return this.request({ from, to: today, employeeIds, reason, requestedById });
    });
  }

  private async safely<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      this.logger.warn(`Attendance recalculation not started: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  // Runs one job (from the queue worker or inline). Idempotent: the calculation only writes days
  // whose figures change.
  async run(jobId: string) {
    const job = await this.prisma.attendanceRecalcJob.findUnique({ where: { id: jobId } });
    if (!job || job.status === AttendanceRecalcStatus.done) return;

    await this.prisma.attendanceRecalcJob.update({ where: { id: jobId }, data: { status: AttendanceRecalcStatus.running, startedAt: new Date(), error: null } });
    try {
      const employeeIds = Array.isArray(job.employeeIds) ? (job.employeeIds as string[]) : undefined;
      const totals = { days: 0, changed: 0, removed: 0, skipped: 0 };
      for (const chunk of monthChunks(isoDate(job.from), isoDate(job.to))) {
        const result = await this.calculation.recalculate({ ...chunk, employeeIds, source: "recalculation" });
        totals.days += result.days;
        totals.changed += result.changed;
        totals.removed += result.removed;
        totals.skipped += result.skipped;
      }
      await this.prisma.attendanceRecalcJob.update({
        where: { id: jobId },
        data: { status: AttendanceRecalcStatus.done, result: totals, finishedAt: new Date() }
      });
    } catch (error) {
      await this.prisma.attendanceRecalcJob.update({
        where: { id: jobId },
        data: { status: AttendanceRecalcStatus.failed, error: error instanceof Error ? error.message.slice(0, 500) : "Lỗi không xác định", finishedAt: new Date() }
      });
      throw error;
    }
  }

  async find(id: string) {
    const job = await this.prisma.attendanceRecalcJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Không tìm thấy yêu cầu tính lại.");
    return this.view(job);
  }

  async recent(limit = 20) {
    const jobs = await this.prisma.attendanceRecalcJob.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(Math.max(limit, 1), 100) });
    return jobs.map((job) => this.view(job));
  }

  private view(job: Prisma.AttendanceRecalcJobGetPayload<object>) {
    return {
      id: job.id,
      from: isoDate(job.from),
      to: isoDate(job.to),
      employees: Array.isArray(job.employeeIds) ? job.employeeIds.length : null,
      reason: job.reason,
      status: job.status,
      result: job.result as { days: number; changed: number; removed: number; skipped?: number } | null,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt
    };
  }
}
