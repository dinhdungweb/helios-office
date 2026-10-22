import { BadRequestException, Injectable } from "@nestjs/common";
import { EmployeeStatus, Prisma, type AttendanceDayStatus } from "@prisma/client";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { pageArgs, paginated, sortArgs } from "../../common/pagination/list-query";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import type { AttendanceListQueryDto, MyAttendanceQueryDto } from "./attendance-query.dto";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import {
  type AttendanceSyncErrorResult,
  AttendanceSyncDto,
  type AttendanceSyncLogDto
} from "./attendance-sync.dto";
import { addDays, localDate, zonedInstant } from "./engine/zoned-time";

type AcceptedPunch = {
  employeeId: string;
  punchTime: Date;
};

export const ATTENDANCE_VIEW_PERMISSIONS = ["permission.attendance.view", "permission.attendance.manage"];
const DAY_SORT_FIELDS = ["workDate", "lateMinutes", "earlyMinutes", "workedMinutes", "workUnits"] as const;
const MAX_MY_DAYS = 62;

const DAY_INCLUDE = {
  employee: { select: { id: true, code: true, fullName: true, department: { select: { id: true, name: true } } } },
  shift: { select: { id: true, code: true, name: true, color: true, startMinute: true, endMinute: true } }
} satisfies Prisma.AttendanceDayInclude;

const dbDate = (date: string) => new Date(`${date}T00:00:00.000Z`);

// AttendanceDay as the API returns it: calendar dates as YYYY-MM-DD, units as numbers, and the
// rule snapshot left out.
function toDayView(day: Prisma.AttendanceDayGetPayload<{ include: typeof DAY_INCLUDE }>) {
  const { policySnapshot: _snapshot, workUnits, paidLeaveUnits, workDate, ...rest } = day;
  void _snapshot;
  return { ...rest, workDate: workDate.toISOString().slice(0, 10), workUnits: Number(workUnits), paidLeaveUnits: Number(paidLeaveUnits) };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculation: AttendanceCalculationService,
    private readonly dataScope: DataScopeService
  ) {}

  // GET /attendance (AT-02): engine results for people in the caller's scope, newest first.
  async findDays(user: AuthenticatedUser, query: AttendanceListQueryDto) {
    const timeZone = await this.calculation.timezone();
    const to = query.to ?? localDate(Date.now(), timeZone);
    const from = query.from ?? addDays(to, -30);
    if (to < from) throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu.");

    const scope = await this.dataScope.resolve(user, ATTENDANCE_VIEW_PERMISSIONS);
    const where: Prisma.AttendanceDayWhereInput = {
      workDate: { gte: dbDate(from), lte: dbDate(to) },
      ...(query.status ? { status: query.status } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      employee: {
        AND: [
          this.dataScope.employeeWhere(scope),
          query.departmentId ? { departmentId: query.departmentId } : {},
          query.q ? { OR: [{ fullName: { contains: query.q, mode: "insensitive" } }, { code: { contains: query.q, mode: "insensitive" } }] } : {}
        ]
      }
    };
    const { skip, take } = pageArgs(query);
    const [items, total] = await Promise.all([
      this.prisma.attendanceDay.findMany({
        where,
        include: DAY_INCLUDE,
        orderBy: [sortArgs(query, DAY_SORT_FIELDS, "workDate"), { employee: { code: "asc" } }],
        skip,
        take
      }),
      this.prisma.attendanceDay.count({ where })
    ]);

    return paginated(items.map(toDayView), total, query);
  }

  // GET /attendance/me (AT-03): my own results for a range, the current month by default.
  async findMyDays(user: AuthenticatedUser, query: MyAttendanceQueryDto) {
    const employeeId = user.account?.employeeId;
    if (!employeeId) return [];

    const timeZone = await this.calculation.timezone();
    const today = localDate(Date.now(), timeZone);
    const from = query.from ?? `${today.slice(0, 7)}-01`;
    const to = query.to ?? today;
    if (to < from) throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu.");
    if ((Date.parse(to) - Date.parse(from)) / 86_400_000 + 1 > MAX_MY_DAYS) throw new BadRequestException(`Xem tối đa ${MAX_MY_DAYS} ngày một lần.`);

    const days = await this.prisma.attendanceDay.findMany({
      where: { employeeId, workDate: { gte: dbDate(from), lte: dbDate(to) } },
      include: DAY_INCLUDE,
      orderBy: { workDate: "asc" }
    });
    return days.map(toDayView);
  }

  // Dashboard figures for the current month, over the people in the caller's scope. The first
  // three keys keep their old meaning for existing dashboards: scheduled days, days on time, days
  // with a missing punch.
  async getSummary(user: AuthenticatedUser) {
    const timeZone = await this.calculation.timezone();
    const today = localDate(Date.now(), timeZone);
    const scope = await this.dataScope.resolve(user, [...ATTENDANCE_VIEW_PERMISSIONS, "hr.dashboard.attendance.view"]);
    const where: Prisma.AttendanceDayWhereInput = {
      workDate: { gte: dbDate(`${today.slice(0, 7)}-01`), lte: dbDate(today) },
      employee: this.dataScope.employeeWhere(scope)
    };

    const [byStatus, rawLogs, syncErrors, devices] = await Promise.all([
      this.prisma.attendanceDay.groupBy({ by: ["status"], where, _count: { _all: true } }),
      this.prisma.attendanceRawLog.count(),
      this.prisma.attendanceSyncError.count(),
      this.prisma.attendanceDevice.count({ where: { status: "active" } })
    ]);
    const count = (...statuses: AttendanceDayStatus[]) =>
      byStatus.filter((row) => statuses.includes(row.status)).reduce((total, row) => total + row._count._all, 0);
    const scheduled = count("on_time", "late", "early_leave", "late_and_early", "missing_checkin", "missing_checkout", "absent");

    return {
      from: `${today.slice(0, 7)}-01`,
      to: today,
      totalRecords: scheduled,
      validRecords: count("on_time"),
      recordsNeedReview: count("missing_checkin", "missing_checkout"),
      late: count("late", "late_and_early"),
      earlyLeave: count("early_leave", "late_and_early"),
      absent: count("absent"),
      rawLogs,
      syncErrors,
      activeDevices: devices
    };
  }

  async syncFromDevice(dto: AttendanceSyncDto) {
    if (dto.logs.length === 0) {
      return this.syncResponse(0, 0, []);
    }

    const device = await this.prisma.attendanceDevice.upsert({
      where: { deviceId: dto.device_id },
      update: {
        storeCode: dto.store_code?.trim() || null,
        lastSyncAt: new Date(),
        status: "active"
      },
      create: {
        deviceId: dto.device_id,
        deviceName: dto.device_id,
        storeCode: dto.store_code?.trim() || null,
        lastSyncAt: new Date()
      }
    });

    const timeZone = await this.calculation.timezone();
    const employeeCodes = Array.from(new Set(dto.logs.map((log) => log.employee_code.trim())));
    const employees = await this.prisma.employee.findMany({
      where: {
        OR: [
          { code: { in: employeeCodes } },
          { attendanceCode: { in: employeeCodes } }
        ]
      },
      select: {
        id: true,
        code: true,
        attendanceCode: true,
        status: true
      }
    });
    const employeeMap = new Map<string, (typeof employees)[number]>();

    for (const employee of employees) {
      employeeMap.set(employee.code.toLowerCase(), employee);
      if (employee.attendanceCode) {
        employeeMap.set(employee.attendanceCode.toLowerCase(), employee);
      }
    }

    let inserted = 0;
    let duplicated = 0;
    const errors: AttendanceSyncErrorResult[] = [];
    const acceptedPunches: AcceptedPunch[] = [];

    for (const log of dto.logs) {
      const employeeCode = log.employee_code.trim();
      const punchTime = parsePunchTime(log.punch_time, timeZone);

      if (!punchTime) {
        errors.push(await this.recordSyncError(device.deviceId, dto.store_code, log, null, "INVALID_PUNCH_TIME", "Thời gian chấm công không hợp lệ"));
        continue;
      }

      const employee = employeeMap.get(employeeCode.toLowerCase());
      if (!employee) {
        errors.push(await this.recordSyncError(device.deviceId, dto.store_code, log, punchTime, "EMPLOYEE_NOT_FOUND", "Mã nhân viên chưa tồn tại trên hệ thống"));
        continue;
      }

      if (employee.status === EmployeeStatus.resigned) {
        errors.push(await this.recordSyncError(device.deviceId, dto.store_code, log, punchTime, "INACTIVE_EMPLOYEE", "Nhân viên đã nghỉ việc"));
        continue;
      }

      try {
        await this.prisma.attendanceRawLog.create({
          data: {
            deviceId: device.deviceId,
            employeeId: employee.id,
            employeeCode,
            storeCode: dto.store_code?.trim() || null,
            punchTime,
            verifyType: log.verify_type?.trim() || null,
            rawPayload: {
              device_id: dto.device_id,
              store_code: dto.store_code ?? null,
              employee_code: employeeCode,
              punch_time: log.punch_time,
              verify_type: log.verify_type ?? null
            } satisfies Prisma.InputJsonValue
          }
        });
        inserted += 1;
        acceptedPunches.push({ employeeId: employee.id, punchTime });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          duplicated += 1;
          acceptedPunches.push({ employeeId: employee.id, punchTime });
          continue;
        }

        throw error;
      }
    }

    await this.calculation.recalculateForPunches(acceptedPunches);

    return this.syncResponse(inserted, duplicated, errors);
  }

  private syncResponse(inserted: number, duplicated: number, errors: AttendanceSyncErrorResult[]) {
    return {
      success: true,
      inserted,
      duplicated,
      failed: errors.length,
      errors
    };
  }

  private async recordSyncError(
    deviceId: string,
    storeCode: string | undefined,
    log: AttendanceSyncLogDto,
    punchTime: Date | null,
    errorType: string,
    message: string
  ): Promise<AttendanceSyncErrorResult> {
    const employeeCode = log.employee_code.trim();
    const existing = await this.prisma.attendanceSyncError.findFirst({
      where: {
        deviceId,
        employeeCode,
        punchTime,
        errorType
      },
      select: { id: true }
    });

    if (!existing) {
      await this.prisma.attendanceSyncError.create({
        data: {
          deviceId,
          employeeCode,
          storeCode: storeCode?.trim() || null,
          punchTime,
          errorType,
          errorMessage: message,
          rawPayload: {
            employee_code: employeeCode,
            punch_time: log.punch_time,
            verify_type: log.verify_type ?? null
          } satisfies Prisma.InputJsonValue
        }
      });
    }

    return {
      employee_code: employeeCode,
      punch_time: log.punch_time,
      error_type: errorType,
      message
    };
  }
}

// Device timestamps: "YYYY-MM-DD HH:mm:ss[.SSS]" with an optional offset. Without one, the time is
// read as wall-clock time in the company time zone, whatever the server's own zone is.
export function parsePunchTime(value: string, timeZone: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:?\d{2})?$/);
  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, millisecondText, zone] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const millisecond = Number((millisecondText ?? "0").padEnd(3, "0"));

  // Rejects dates such as 2026-02-30 or 24:00:00.
  const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute ||
    check.getUTCSeconds() !== second
  ) {
    return null;
  }

  if (zone) {
    const parsed = new Date(`${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}.${String(millisecond).padStart(3, "0")}${zone}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return new Date(zonedInstant(`${yearText}-${monthText}-${dayText}`, hour * 60 + minute, timeZone) + second * 1000 + millisecond);
}
