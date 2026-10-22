import { Injectable } from "@nestjs/common";
import { AttendanceStatus, EmployeeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import {
  type AttendanceSyncErrorResult,
  AttendanceSyncDto,
  type AttendanceSyncLogDto
} from "./attendance-sync.dto";
import { localDate, zonedInstant } from "./engine/zoned-time";

type AcceptedPunch = {
  employeeId: string;
  punchTime: Date;
};

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculation: AttendanceCalculationService
  ) {}

  findRecords() {
    return this.prisma.attendanceRecord.findMany({
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }]
    });
  }

  findEmployeeRecords(employeeId: string | null | undefined) {
    if (!employeeId) {
      return [];
    }

    return this.prisma.attendanceRecord.findMany({
      where: { employeeId },
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }]
    });
  }

  async getSummary() {
    const [totalRecords, recordsNeedReview, rawLogs, syncErrors, devices] = await Promise.all([
      this.prisma.attendanceRecord.count(),
      this.prisma.attendanceRecord.count({
        where: {
          status: {
            not: AttendanceStatus.valid
          }
        }
      }),
      this.prisma.attendanceRawLog.count(),
      this.prisma.attendanceSyncError.count(),
      this.prisma.attendanceDevice.count({ where: { status: "active" } })
    ]);

    return {
      totalRecords,
      validRecords: totalRecords - recordsNeedReview,
      recordsNeedReview,
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

    await this.rebuildDailyAttendance(acceptedPunches, timeZone);
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

  // Old per-calendar-day record, kept until reads move to AttendanceDay (plan task 10).
  private async rebuildDailyAttendance(punches: AcceptedPunch[], timeZone: string) {
    const dayKeys = new Map<string, { employeeId: string; workDate: Date; nextDay: Date }>();

    for (const punch of punches) {
      const date = localDate(punch.punchTime.getTime(), timeZone);
      const workDate = new Date(zonedInstant(date, 0, timeZone));
      const nextDay = new Date(zonedInstant(date, 1440, timeZone));
      dayKeys.set(`${punch.employeeId}:${date}`, { employeeId: punch.employeeId, workDate, nextDay });
    }

    for (const { employeeId, workDate, nextDay } of dayKeys.values()) {
      const logs = await this.prisma.attendanceRawLog.findMany({
        where: {
          employeeId,
          punchTime: {
            gte: workDate,
            lt: nextDay
          }
        },
        orderBy: { punchTime: "asc" },
        select: { punchTime: true }
      });

      if (logs.length === 0) {
        continue;
      }

      const checkIn = logs[0].punchTime;
      const checkOut = logs.length > 1 ? logs[logs.length - 1].punchTime : null;
      const status = checkOut ? AttendanceStatus.valid : AttendanceStatus.missing_checkout;

      await this.prisma.attendanceRecord.upsert({
        where: {
          employeeId_workDate_source: {
            employeeId,
            workDate,
            source: "machine"
          }
        },
        update: { checkIn, checkOut, status },
        create: {
          employeeId,
          workDate,
          checkIn,
          checkOut,
          source: "machine",
          status
        }
      });
    }
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
