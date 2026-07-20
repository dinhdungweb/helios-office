import { Injectable } from "@nestjs/common";
import { AttendanceStatus, EmployeeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  type AttendanceSyncErrorResult,
  AttendanceSyncDto,
  type AttendanceSyncLogDto
} from "./attendance-sync.dto";

type AcceptedPunch = {
  employeeId: string;
  punchTime: Date;
};

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

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
      const punchTime = this.parsePunchTime(log.punch_time);

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

    await this.rebuildDailyAttendance(acceptedPunches);

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

  private async rebuildDailyAttendance(punches: AcceptedPunch[]) {
    const dayKeys = new Map<string, { employeeId: string; workDate: Date }>();

    for (const punch of punches) {
      const workDate = new Date(punch.punchTime.getFullYear(), punch.punchTime.getMonth(), punch.punchTime.getDate());
      dayKeys.set(`${punch.employeeId}:${workDate.toISOString()}`, { employeeId: punch.employeeId, workDate });
    }

    for (const { employeeId, workDate } of dayKeys.values()) {
      const nextDay = new Date(workDate);
      nextDay.setDate(nextDay.getDate() + 1);
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

  private parsePunchTime(value: string) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:?\d{2})?$/);
    if (!match) {
      return null;
    }

    const [, yearText, monthText, dayText, hourText, minuteText, secondText, millisecondText, zone] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    const millisecond = Number((millisecondText ?? "0").padEnd(3, "0"));
    const parsed = zone
      ? new Date(`${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}.${String(millisecond).padStart(3, "0")}${zone}`)
      : new Date(year, month - 1, day, hour, minute, second, millisecond);

    if (
      Number.isNaN(parsed.getTime()) ||
      (!zone && (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day ||
        parsed.getHours() !== hour ||
        parsed.getMinutes() !== minute ||
        parsed.getSeconds() !== second
      ))
    ) {
      return null;
    }

    return parsed;
  }
}
