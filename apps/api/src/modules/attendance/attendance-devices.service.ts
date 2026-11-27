import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { CreateAttendanceDeviceDto, UpdateAttendanceDeviceDto } from "./attendance-devices.dto";

// Attendance machines (AT-19), like 1Office's "Máy chấm": each pushes punches through
// POST /attendance/sync with its device id. Devices that have logs are turned off rather than
// deleted, so their history stays readable.

export const DEVICE_MANAGE_PERMISSION = "attendance.device.manage";

const DEVICE_INCLUDE = {
  workplace: { select: { id: true, name: true } },
  _count: { select: { rawLogs: true, syncErrors: true } }
} satisfies Prisma.AttendanceDeviceInclude;

type DeviceRow = Prisma.AttendanceDeviceGetPayload<{ include: typeof DEVICE_INCLUDE }>;

function toView(device: DeviceRow) {
  const { _count, ...rest } = device;
  return { ...rest, logCount: _count.rawLogs, errorCount: _count.syncErrors };
}

@Injectable()
export class AttendanceDevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async findAll() {
    const devices = await this.prisma.attendanceDevice.findMany({ include: DEVICE_INCLUDE, orderBy: [{ status: "asc" }, { deviceId: "asc" }] });
    return devices.map(toView);
  }

  async create(dto: CreateAttendanceDeviceDto, actorId?: string) {
    await this.assertWorkplace(dto.workplaceId);
    try {
      const device = await this.prisma.attendanceDevice.create({
        data: {
          deviceId: dto.deviceId.trim(),
          deviceName: dto.deviceName?.trim() || null,
          storeCode: dto.storeCode?.trim() || null,
          workplaceId: dto.workplaceId || null,
          note: dto.note?.trim() || null,
          status: dto.status ?? "active"
        },
        include: DEVICE_INCLUDE
      });
      await this.writeAudit("attendance_device.create", device.id, null, device, actorId);
      return toView(device);
    } catch (error) {
      throw this.uniqueId(error);
    }
  }

  async update(id: string, dto: UpdateAttendanceDeviceDto, actorId?: string) {
    const before = await this.find(id);
    if (dto.workplaceId) await this.assertWorkplace(dto.workplaceId);
    const device = await this.prisma.attendanceDevice.update({
      where: { id },
      data: {
        ...(dto.deviceName !== undefined ? { deviceName: dto.deviceName?.trim() || null } : {}),
        ...(dto.storeCode !== undefined ? { storeCode: dto.storeCode?.trim() || null } : {}),
        ...(dto.workplaceId !== undefined ? { workplaceId: dto.workplaceId || null } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {})
      },
      include: DEVICE_INCLUDE
    });
    await this.writeAudit(dto.status && dto.status !== before.status ? `attendance_device.${dto.status === "active" ? "enable" : "disable"}` : "attendance_device.update", id, before, device, actorId);
    return toView(device);
  }

  async remove(id: string, actorId?: string) {
    const device = await this.find(id);
    if (device._count.rawLogs > 0 || device._count.syncErrors > 0) {
      throw new ConflictException("Máy đã có log chấm công, hãy tắt máy thay vì xoá để giữ lịch sử.");
    }
    await this.prisma.attendanceDevice.delete({ where: { id } });
    await this.writeAudit("attendance_device.delete", id, device, null, actorId);
    return { id, deleted: true };
  }

  private async find(id: string) {
    const device = await this.prisma.attendanceDevice.findUnique({ where: { id }, include: DEVICE_INCLUDE });
    if (!device) throw new NotFoundException("Không tìm thấy máy chấm công.");
    return device;
  }

  private async assertWorkplace(workplaceId?: string | null) {
    if (!workplaceId) return;
    const workplace = await this.prisma.workplace.findUnique({ where: { id: workplaceId }, select: { id: true } });
    if (!workplace) throw new BadRequestException("Nơi làm việc không tồn tại.");
  }

  private uniqueId(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? new ConflictException("Mã máy đã tồn tại.") : error;
  }

  private async writeAudit(action: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    const json = (value: unknown) => (value === null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue));
    await this.prisma.auditLog.create({
      data: { ...this.audit.contextFields(), actorId, action, entityType: "AttendanceDevice", entityId, beforeValue: json(before), afterValue: json(after) }
    });
  }
}
