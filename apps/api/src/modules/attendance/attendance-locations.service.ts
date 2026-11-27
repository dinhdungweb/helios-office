import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AttendanceLocationDto } from "./attendance-locations.dto";
import { parseIpRange } from "./engine/location-check";

// Valid check-in places (DV-07), like 1Office's "Chấm công GPS/Wifi" settings. Each place is one
// kind: a GPS point with a radius, a wifi network, or office IP ranges.

const LOCATION_INCLUDE = { workplace: { select: { id: true, name: true } } } satisfies Prisma.AttendanceLocationInclude;
const MAC = /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i;

@Injectable()
export class AttendanceLocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  findAll() {
    return this.prisma.attendanceLocation.findMany({ include: LOCATION_INCLUDE, orderBy: [{ status: "asc" }, { name: "asc" }] });
  }

  async create(dto: AttendanceLocationDto, actorId?: string) {
    const data = await this.validate(dto);
    const location = await this.prisma.attendanceLocation.create({ data, include: LOCATION_INCLUDE });
    await this.writeAudit("attendance_location.create", location.id, null, location, actorId);
    return location;
  }

  async update(id: string, dto: AttendanceLocationDto, actorId?: string) {
    const before = await this.find(id);
    const data = await this.validate(dto);
    const location = await this.prisma.attendanceLocation.update({ where: { id }, data, include: LOCATION_INCLUDE });
    await this.writeAudit("attendance_location.update", id, before, location, actorId);
    return location;
  }

  // Check-in logs keep only the place's id and name, so a place can always be removed.
  async remove(id: string, actorId?: string) {
    const before = await this.find(id);
    await this.prisma.attendanceLocation.delete({ where: { id } });
    await this.writeAudit("attendance_location.delete", id, before, null, actorId);
    return { id, deleted: true };
  }

  private async find(id: string) {
    const location = await this.prisma.attendanceLocation.findUnique({ where: { id } });
    if (!location) throw new NotFoundException("Không tìm thấy điểm chấm công.");
    return location;
  }

  // Keeps only the fields of the chosen kind, so a place never half-matches another kind.
  private async validate(dto: AttendanceLocationDto) {
    if (dto.workplaceId) {
      const workplace = await this.prisma.workplace.findUnique({ where: { id: dto.workplaceId }, select: { id: true } });
      if (!workplace) throw new BadRequestException("Nơi làm việc không tồn tại.");
    }
    const base = { name: dto.name.trim(), type: dto.type, workplaceId: dto.workplaceId || null, status: dto.status ?? "active", note: dto.note?.trim() || null };
    const empty = { latitude: null, longitude: null, radiusMeters: 100, ssid: null, bssid: null, ipRanges: [] as string[] };

    if (dto.type === "gps") {
      if (typeof dto.latitude !== "number" || typeof dto.longitude !== "number") throw new BadRequestException("Chọn vị trí trên bản đồ hoặc nhập vĩ độ, kinh độ.");
      return { ...base, ...empty, latitude: dto.latitude, longitude: dto.longitude, radiusMeters: dto.radiusMeters ?? 100 };
    }
    if (dto.type === "wifi") {
      const ssid = dto.ssid?.trim() || null;
      const bssid = dto.bssid?.trim().toLowerCase().replace(/-/g, ":") || null;
      if (!ssid && !bssid) throw new BadRequestException("Nhập tên wifi (SSID) hoặc địa chỉ MAC của bộ phát (BSSID).");
      if (bssid && !MAC.test(bssid)) throw new BadRequestException("BSSID phải có dạng aa:bb:cc:dd:ee:ff.");
      return { ...base, ...empty, ssid, bssid };
    }
    const ipRanges = [...new Set((dto.ipRanges ?? []).map((range) => range.trim()).filter(Boolean))];
    if (ipRanges.length === 0) throw new BadRequestException("Nhập ít nhất một địa chỉ IP hoặc dải IP.");
    const invalid = ipRanges.filter((range) => !parseIpRange(range));
    if (invalid.length) throw new BadRequestException(`Dải IP không hợp lệ: ${invalid.join(", ")}. Dùng dạng 113.160.12.5 hoặc 113.160.12.0/24.`);
    return { ...base, ...empty, ipRanges };
  }

  private async writeAudit(action: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    const json = (value: unknown) => (value === null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue));
    await this.prisma.auditLog.create({
      data: { ...this.audit.contextFields(), actorId, action, entityType: "AttendanceLocation", entityId, beforeValue: json(before), afterValue: json(after) }
    });
  }
}
