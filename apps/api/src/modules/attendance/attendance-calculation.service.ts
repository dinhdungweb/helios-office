import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { ManualOverride } from "./engine/attendance-engine";
import { calculateEmployeeDays, type CalcShift, type EmployeeDay } from "./engine/employee-days";
import { addDays, localDate, zonedInstant } from "./engine/zoned-time";

// Stores the engine's results in AttendanceDay (AT-11, design §6.5). Reads every input for a batch
// of employees at once; the engine itself never touches the database.

export type ChangeSource = "punch_sync" | "recalculation" | "manual";

export type RecalculateOptions = {
  from: string;
  to: string;
  // Omitted: everyone employed at some point in the range.
  employeeIds?: string[];
  source: ChangeSource;
};

const BATCH_SIZE = 50;
const WRITE_CHUNK = 100;

const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const dbDate = (date: string) => new Date(`${date}T00:00:00.000Z`);

@Injectable()
export class AttendanceCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy() {
    const policy = await this.prisma.attendancePolicy.findUnique({ where: { id: "default" } });
    if (!policy) throw new NotFoundException("Chưa có chính sách chấm công.");
    return policy;
  }

  async timezone() {
    return (await this.getPolicy()).timezone;
  }

  // Recomputes the work dates touched by newly synced punches: each punch's calendar date and the
  // day before it (a night shift's checkout belongs to the previous work date).
  async recalculateForPunches(punches: Array<{ employeeId: string; punchTime: Date }>, source: ChangeSource = "punch_sync") {
    if (punches.length === 0) return { days: 0, changed: 0, removed: 0 };
    const timeZone = await this.timezone();
    const dates = punches.map((punch) => localDate(punch.punchTime.getTime(), timeZone)).sort();
    return this.recalculate({
      from: addDays(dates[0], -1),
      to: dates[dates.length - 1],
      employeeIds: [...new Set(punches.map((punch) => punch.employeeId))],
      source
    });
  }

  async recalculate(options: RecalculateOptions) {
    const policy = await this.getPolicy();
    const timeZone = policy.timezone;
    const rangeStart = new Date(zonedInstant(options.from, 0, timeZone));
    const rangeEnd = new Date(zonedInstant(addDays(options.to, 1), 0, timeZone));

    const employees = await this.prisma.employee.findMany({
      where: {
        ...(options.employeeIds ? { id: { in: options.employeeIds } } : {}),
        startDate: { lt: rangeEnd },
        OR: [{ endDate: null }, { endDate: { gte: rangeStart } }]
      },
      select: { id: true, startDate: true, endDate: true, department: { select: { defaultShiftId: true } } },
      orderBy: { id: "asc" }
    });

    const shiftRows = await this.prisma.shift.findMany({ where: { status: "active" } });
    const shifts = new Map<string, CalcShift>(shiftRows.map((shift) => [shift.id, { ...shift, workUnits: Number(shift.workUnits) }]));

    // Neighbouring dates are loaded too: their shifts decide where punches near midnight go.
    const loadFrom = addDays(options.from, -1);
    const loadTo = addDays(options.to, 1);
    const holidayRows = await this.prisma.holiday.findMany({ where: { date: { gte: dbDate(loadFrom), lte: dbDate(loadTo) } } });
    const holidays = new Map(holidayRows.map((holiday) => [isoDate(holiday.date), { type: holiday.type, paid: holiday.paid }]));

    const totals = { days: 0, changed: 0, removed: 0 };
    for (let index = 0; index < employees.length; index += BATCH_SIZE) {
      const batch = employees.slice(index, index + BATCH_SIZE);
      const ids = batch.map((employee) => employee.id);

      const [assignmentRows, logs, adjustments, existing] = await Promise.all([
        this.prisma.shiftAssignment.findMany({
          where: { employeeId: { in: ids }, date: { gte: dbDate(loadFrom), lte: dbDate(loadTo) } },
          select: { employeeId: true, date: true, shiftId: true }
        }),
        // Shift windows reach at most 12 hours past a neighbouring day.
        this.prisma.attendanceRawLog.findMany({
          where: {
            employeeId: { in: ids },
            punchTime: { gte: new Date(zonedInstant(addDays(options.from, -2), 0, timeZone)), lt: new Date(zonedInstant(addDays(options.to, 3), 0, timeZone)) }
          },
          select: { employeeId: true, punchTime: true },
          orderBy: { punchTime: "asc" }
        }),
        this.prisma.attendanceAdjustment.findMany({
          where: { employeeId: { in: ids }, revokedAt: null, workDate: { gte: dbDate(options.from), lte: dbDate(options.to) } },
          orderBy: { createdAt: "asc" }
        }),
        this.prisma.attendanceDay.findMany({
          where: { employeeId: { in: ids }, workDate: { gte: dbDate(options.from), lte: dbDate(options.to) } }
        })
      ]);

      const writes: Prisma.PrismaPromise<unknown>[] = [];
      for (const employee of batch) {
        const days = calculateEmployeeDays({
          from: options.from,
          to: options.to,
          policy,
          shifts,
          holidays,
          assignments: new Map(
            assignmentRows.filter((row) => row.employeeId === employee.id).map((row) => [isoDate(row.date), row.shiftId])
          ),
          departmentDefaultShiftId: employee.department.defaultShiftId,
          employment: {
            startDate: localDate(employee.startDate.getTime(), timeZone),
            endDate: employee.endDate ? localDate(employee.endDate.getTime(), timeZone) : null
          },
          punches: logs.filter((log) => log.employeeId === employee.id).map((log) => log.punchTime),
          // Later adjustments overwrite earlier ones for the same date.
          manual: new Map(
            adjustments
              .filter((adjustment) => adjustment.employeeId === employee.id)
              .map((adjustment) => [isoDate(adjustment.workDate), toManualOverride(adjustment)])
          )
        });

        const stored = new Map(existing.filter((row) => row.employeeId === employee.id).map((row) => [isoDate(row.workDate), row]));
        for (const day of days) {
          const current = stored.get(day.workDate);
          if (!day.result) {
            if (current) {
              writes.push(this.prisma.attendanceDay.delete({ where: { id: current.id } }));
              totals.removed += 1;
            }
            continue;
          }

          totals.days += 1;
          const data = toRow(day);
          if (current && sameFigures(current, data)) continue;
          totals.changed += 1;
          writes.push(
            this.prisma.attendanceDay.upsert({
              where: { employeeId_workDate: { employeeId: employee.id, workDate: dbDate(day.workDate) } },
              create: { employeeId: employee.id, workDate: dbDate(day.workDate), ...data, lastChangeSource: options.source },
              update: { ...data, lastChangeSource: options.source, calculatedAt: new Date() }
            })
          );
        }
      }

      for (let start = 0; start < writes.length; start += WRITE_CHUNK) {
        await this.prisma.$transaction(writes.slice(start, start + WRITE_CHUNK));
      }
    }

    return totals;
  }
}

function toManualOverride(adjustment: {
  punchesSet: boolean;
  checkIn: Date | null;
  checkOut: Date | null;
  workUnits: Prisma.Decimal | null;
  status: ManualOverride["status"];
}): ManualOverride {
  return {
    ...(adjustment.punchesSet ? { checkIn: adjustment.checkIn, checkOut: adjustment.checkOut } : {}),
    workUnits: adjustment.workUnits === null ? null : Number(adjustment.workUnits),
    status: adjustment.status
  };
}

function toRow(day: EmployeeDay) {
  const result = day.result!;
  return {
    shiftId: result.shiftId,
    scheduledStart: result.scheduledStart,
    scheduledEnd: result.scheduledEnd,
    checkIn: result.checkIn,
    checkOut: result.checkOut,
    workedMinutes: result.workedMinutes,
    lateMinutes: result.lateMinutes,
    earlyMinutes: result.earlyMinutes,
    outsideShiftMinutes: result.outsideShiftMinutes,
    nightMinutes: result.nightMinutes,
    workUnits: new Prisma.Decimal(result.workUnits),
    paidLeaveUnits: new Prisma.Decimal(result.paidLeaveUnits),
    status: result.status,
    flags: result.flags,
    holidayType: day.holidayType,
    punchCount: day.punchCount,
    policySnapshot: { shiftCode: day.shiftCode, ...day.policy } as Prisma.InputJsonValue
  };
}

type StoredFigures = Omit<ReturnType<typeof toRow>, "workUnits" | "paidLeaveUnits" | "policySnapshot"> & {
  workUnits: Prisma.Decimal | number;
  paidLeaveUnits: Prisma.Decimal | number;
  policySnapshot: unknown;
};

const time = (value: Date | null) => value?.getTime() ?? null;

// jsonb reorders object keys, so snapshots are compared with sorted keys.
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

// Whether a recalculation changed anything; unchanged days keep their last change source.
export function sameFigures(stored: StoredFigures, next: ReturnType<typeof toRow>) {
  return (
    stored.shiftId === next.shiftId &&
    time(stored.scheduledStart) === time(next.scheduledStart) &&
    time(stored.scheduledEnd) === time(next.scheduledEnd) &&
    time(stored.checkIn) === time(next.checkIn) &&
    time(stored.checkOut) === time(next.checkOut) &&
    stored.workedMinutes === next.workedMinutes &&
    stored.lateMinutes === next.lateMinutes &&
    stored.earlyMinutes === next.earlyMinutes &&
    stored.outsideShiftMinutes === next.outsideShiftMinutes &&
    stored.nightMinutes === next.nightMinutes &&
    Number(stored.workUnits) === Number(next.workUnits) &&
    Number(stored.paidLeaveUnits) === Number(next.paidLeaveUnits) &&
    stored.status === next.status &&
    stored.flags.join(",") === next.flags.join(",") &&
    stored.holidayType === next.holidayType &&
    stored.punchCount === next.punchCount &&
    stableJson(stored.policySnapshot) === stableJson(next.policySnapshot)
  );
}
