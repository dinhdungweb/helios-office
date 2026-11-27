import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { JobCatalogStatus, Prisma, type ShiftPattern } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { CreateShiftPatternDto, UpdateShiftPatternDto } from "./shift-patterns.dto";

export function patternDays(pattern: Pick<ShiftPattern, "days">) {
  return pattern.days as Array<string | null>;
}

// Repeating schedules for bulk scheduling (AT-08). A pattern only names shifts; applying it writes
// ordinary ShiftAssignment rows, so deleting a pattern never changes a schedule.
@Injectable()
export class ShiftPatternsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async findAll() {
    const patterns = await this.prisma.shiftPattern.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }] });
    return patterns.map((pattern) => ({ ...pattern, days: patternDays(pattern) }));
  }

  async findActive(id: string) {
    const pattern = await this.prisma.shiftPattern.findUnique({ where: { id } });
    if (!pattern || pattern.status !== JobCatalogStatus.active) throw new NotFoundException("Không tìm thấy mẫu xếp ca.");
    return { ...pattern, days: patternDays(pattern) };
  }

  async create(dto: CreateShiftPatternDto, actorId?: string) {
    await this.assertDays(dto.days);
    try {
      const pattern = await this.prisma.shiftPattern.create({
        data: { name: dto.name.trim(), days: dto.days, description: dto.description?.trim() || null }
      });
      await this.writeAudit("shift_pattern.create", pattern.id, null, pattern, actorId);
      return { ...pattern, days: patternDays(pattern) };
    } catch (error) {
      throw this.uniqueName(error);
    }
  }

  async update(id: string, dto: UpdateShiftPatternDto, actorId?: string) {
    const before = await this.find(id);
    if (dto.days) await this.assertDays(dto.days);
    try {
      const pattern = await this.prisma.shiftPattern.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.days !== undefined ? { days: dto.days } : {}),
          ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {})
        }
      });
      await this.writeAudit("shift_pattern.update", id, before, pattern, actorId);
      return { ...pattern, days: patternDays(pattern) };
    } catch (error) {
      throw this.uniqueName(error);
    }
  }

  async remove(id: string, actorId?: string) {
    const pattern = await this.find(id);
    await this.prisma.shiftPattern.delete({ where: { id } });
    await this.writeAudit("shift_pattern.delete", id, pattern, null, actorId);
    return { id, deleted: true };
  }

  // Every entry is null (day off) or an active shift.
  private async assertDays(days: unknown[]) {
    if (days.some((day) => day !== null && typeof day !== "string")) {
      throw new BadRequestException("Mỗi ngày của mẫu phải là một ca hoặc ngày nghỉ.");
    }
    const ids = [...new Set(days.filter((day): day is string => typeof day === "string"))];
    if (ids.length === 0) return;
    const active = await this.prisma.shift.count({ where: { id: { in: ids }, status: JobCatalogStatus.active } });
    if (active !== ids.length) throw new BadRequestException("Mẫu chỉ dùng được các ca đang hoạt động.");
  }

  private async find(id: string) {
    const pattern = await this.prisma.shiftPattern.findUnique({ where: { id } });
    if (!pattern) throw new NotFoundException("Không tìm thấy mẫu xếp ca.");
    return pattern;
  }

  private uniqueName(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? new ConflictException("Tên mẫu đã tồn tại.") : error;
  }

  private async writeAudit(action: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    const json = (value: unknown) => (value === null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue));
    await this.prisma.auditLog.create({
      data: { ...this.audit.contextFields(), actorId, action, entityType: "ShiftPattern", entityId, beforeValue: json(before), afterValue: json(after) }
    });
  }
}
