import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { pageArgs, paginated } from "../../common/pagination/list-query";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import type { RawLogQueryDto, ResolveSyncErrorDto, SyncErrorQueryDto } from "./attendance-logs.dto";
import { addDays, localDate, zonedInstant } from "./engine/zoned-time";

// Raw punches (AT-21) and punches the sync refused (AT-20), on the "Máy chấm" tab. An error for an
// unknown code is fixed by giving that code to the right employee: every refused punch with the
// code then becomes a raw log and the days are recalculated.

export const RAW_LOG_PERMISSIONS = ["permission.attendance.view", "permission.attendance.manage", "attendance.device.manage"];
export const SYNC_ERROR_PERMISSIONS = ["attendance.device.manage", "permission.attendance.manage"];

const ERROR_LABELS: Record<string, string> = {
  EMPLOYEE_NOT_FOUND: "Mã chấm công chưa gán cho nhân sự",
  INVALID_PUNCH_TIME: "Thời gian chấm không hợp lệ",
  INACTIVE_EMPLOYEE: "Nhân sự đã nghỉ việc"
};

@Injectable()
export class AttendanceLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScope: DataScopeService,
    private readonly calculation: AttendanceCalculationService,
    private readonly audit: AuditService
  ) {}

  async rawLogs(user: AuthenticatedUser, query: RawLogQueryDto) {
    const timeZone = await this.calculation.timezone();
    const to = query.to ?? localDate(Date.now(), timeZone);
    const from = query.from ?? addDays(to, -6);
    if (to < from) throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu.");

    const scope = await this.dataScope.resolve(user, RAW_LOG_PERMISSIONS);
    const where: Prisma.AttendanceRawLogWhereInput = {
      punchTime: { gte: new Date(zonedInstant(from, 0, timeZone)), lt: new Date(zonedInstant(addDays(to, 1), 0, timeZone)) },
      ...(query.deviceId ? { deviceId: query.deviceId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      employee: {
        AND: [
          this.dataScope.employeeWhere(scope),
          query.q ? { OR: [{ fullName: { contains: query.q, mode: "insensitive" } }, { code: { contains: query.q, mode: "insensitive" } }] } : {}
        ]
      }
    };
    const { skip, take } = pageArgs(query);
    const [items, total] = await Promise.all([
      this.prisma.attendanceRawLog.findMany({
        where,
        include: {
          employee: { select: { id: true, code: true, fullName: true, department: { select: { name: true } } } },
          device: { select: { deviceId: true, deviceName: true } }
        },
        orderBy: { punchTime: query.order === "asc" ? "asc" : "desc" },
        skip,
        take
      }),
      this.prisma.attendanceRawLog.count({ where })
    ]);
    return {
      from,
      to,
      ...paginated(
        items.map((log) => ({
          id: log.id,
          punchTime: log.punchTime,
          verifyType: log.verifyType,
          employeeCode: log.employeeCode,
          syncedAt: log.syncedAt,
          employee: { id: log.employee.id, code: log.employee.code, fullName: log.employee.fullName, department: log.employee.department.name },
          // Web/app check-ins (AT-13) have no machine: they name the approved device and the place.
          source: log.source,
          direction: log.direction,
          device: log.device ? { deviceId: log.device.deviceId, deviceName: log.device.deviceName } : { deviceId: log.clientDeviceId ?? log.source, deviceName: log.clientDeviceName },
          locationName: log.locationName,
          photoFileId: log.photoFileId
        })),
        total,
        query
      )
    };
  }

  async syncErrors(query: SyncErrorQueryDto) {
    const where: Prisma.AttendanceSyncErrorWhereInput = {
      resolvedAt: query.status === "resolved" ? { not: null } : query.status === "all" ? undefined : null,
      ...(query.deviceId ? { deviceId: query.deviceId } : {}),
      ...(query.q ? { employeeCode: { contains: query.q, mode: "insensitive" } } : {})
    };
    const { skip, take } = pageArgs(query);
    const [items, total, openByCode] = await Promise.all([
      this.prisma.attendanceSyncError.findMany({
        where,
        include: { device: { select: { deviceId: true, deviceName: true } } },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take
      }),
      this.prisma.attendanceSyncError.count({ where }),
      // How many open errors share each code, so HR sees what one mapping fixes.
      this.prisma.attendanceSyncError.groupBy({ by: ["employeeCode"], where: { resolvedAt: null }, _count: { _all: true } })
    ]);
    const counts = new Map(openByCode.map((row) => [row.employeeCode, row._count._all]));
    return paginated(
      items.map((error) => ({
        id: error.id,
        employeeCode: error.employeeCode,
        punchTime: error.punchTime,
        errorType: error.errorType,
        errorLabel: ERROR_LABELS[error.errorType] ?? error.errorMessage,
        device: { deviceId: error.device.deviceId, deviceName: error.device.deviceName },
        createdAt: error.createdAt,
        sameCodeOpen: error.employeeCode ? counts.get(error.employeeCode) ?? 0 : 0,
        resolvedAt: error.resolvedAt,
        resolution: error.resolution,
        resolutionNote: error.resolutionNote
      })),
      total,
      query
    );
  }

  // People in scope to give an unknown code to, searched by name or code.
  async candidates(user: AuthenticatedUser, q?: string) {
    const scope = await this.dataScope.resolve(user, SYNC_ERROR_PERMISSIONS);
    const term = q?.trim();
    const employees = await this.prisma.employee.findMany({
      where: {
        AND: [
          this.dataScope.employeeWhere(scope),
          { status: { not: "resigned" } },
          term
            ? { OR: [{ fullName: { contains: term, mode: "insensitive" } }, { code: { contains: term, mode: "insensitive" } }, { attendanceCode: { contains: term, mode: "insensitive" } }] }
            : {}
        ]
      },
      select: { id: true, code: true, fullName: true, attendanceCode: true, department: { select: { name: true } } },
      orderBy: { code: "asc" },
      take: 20
    });
    return employees.map(({ department, ...employee }) => ({ ...employee, department: department.name }));
  }

  async resolve(user: AuthenticatedUser, id: string, dto: ResolveSyncErrorDto) {
    const error = await this.prisma.attendanceSyncError.findUnique({ where: { id } });
    if (!error) throw new NotFoundException("Không tìm thấy lỗi đồng bộ.");
    if (error.resolvedAt) throw new ConflictException("Lỗi này đã được xử lý.");
    const actor = user.account?.employeeId ?? user.account?.id ?? null;

    if (dto.action === "dismiss") {
      await this.prisma.attendanceSyncError.update({
        where: { id },
        data: { resolvedAt: new Date(), resolvedById: actor, resolution: "dismissed", resolutionNote: dto.note?.trim() || null }
      });
      await this.writeAudit("attendance_sync_error.dismiss", id, error, { note: dto.note ?? null }, user.account?.employeeId ?? undefined);
      return { resolved: 1, imported: 0 };
    }

    if (error.errorType !== "EMPLOYEE_NOT_FOUND" || !error.employeeCode) {
      throw new BadRequestException("Chỉ gán mã được cho lỗi mã chấm công chưa gán; lỗi khác hãy bỏ qua.");
    }
    if (!dto.employeeId) throw new BadRequestException("Chọn nhân sự để gán mã chấm công.");
    const code = error.employeeCode;

    const scope = await this.dataScope.resolve(user, SYNC_ERROR_PERMISSIONS);
    const employee = await this.prisma.employee.findFirst({
      where: { AND: [{ id: dto.employeeId }, this.dataScope.employeeWhere(scope)] },
      select: { id: true, code: true, fullName: true, attendanceCode: true }
    });
    if (!employee) throw new NotFoundException("Không tìm thấy nhân sự hoặc nhân sự ngoài phạm vi của bạn.");
    const owner = await this.prisma.employee.findFirst({
      where: { OR: [{ code: { equals: code, mode: "insensitive" } }, { attendanceCode: { equals: code, mode: "insensitive" } }] },
      select: { id: true, fullName: true }
    });
    if (owner && owner.id !== employee.id) throw new ConflictException(`Mã ${code} đang thuộc ${owner.fullName}.`);
    if (!owner && employee.attendanceCode && employee.attendanceCode.toLowerCase() !== code.toLowerCase()) {
      throw new ConflictException(`${employee.fullName} đã có mã chấm công ${employee.attendanceCode}. Đổi mã trong hồ sơ nhân sự nếu cần.`);
    }

    const open = await this.prisma.attendanceSyncError.findMany({
      where: { employeeCode: { equals: code, mode: "insensitive" }, errorType: "EMPLOYEE_NOT_FOUND", resolvedAt: null }
    });
    const punches = open.filter((item) => item.punchTime);
    const verifyType = (payload: Prisma.JsonValue | null) =>
      payload && typeof payload === "object" && !Array.isArray(payload) && typeof payload.verify_type === "string" ? payload.verify_type : null;

    const [, imported] = await this.prisma.$transaction([
      this.prisma.employee.update({ where: { id: employee.id }, data: owner ? {} : { attendanceCode: code } }),
      this.prisma.attendanceRawLog.createMany({
        data: punches.map((item) => ({
          deviceId: item.deviceId,
          employeeId: employee.id,
          employeeCode: code,
          storeCode: item.storeCode,
          punchTime: item.punchTime!,
          verifyType: verifyType(item.rawPayload),
          rawPayload: item.rawPayload ?? undefined
        })),
        skipDuplicates: true
      }),
      this.prisma.attendanceSyncError.updateMany({
        where: { id: { in: open.map((item) => item.id) } },
        data: { resolvedAt: new Date(), resolvedById: actor, resolution: "assigned", resolutionNote: `Gán cho ${employee.code} — ${employee.fullName}` }
      })
    ]);

    await this.calculation.recalculateForPunches(punches.map((item) => ({ employeeId: employee.id, punchTime: item.punchTime! })), "punch_sync");
    await this.writeAudit("attendance_sync_error.assign", id, null, { code, employeeId: employee.id, resolved: open.length, imported: imported.count }, user.account?.employeeId ?? undefined);
    return { resolved: open.length, imported: imported.count };
  }

  private async writeAudit(action: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    const json = (value: unknown) => (value === null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue));
    await this.prisma.auditLog.create({
      data: { ...this.audit.contextFields(), actorId, action, entityType: "AttendanceSyncError", entityId, beforeValue: json(before), afterValue: json(after) }
    });
  }
}
