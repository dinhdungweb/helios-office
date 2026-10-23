import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AttendancePeriodStatus, Prisma, type StandardWorkdayRule } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { requiredMinutesFor } from "../shifts/shift-rules";
import { overlaps, pickRule, standardFor, type StandardRule, type StandardTarget } from "./engine/standard-workdays";

// Standard work units per group (AT-25). Read by the timesheet, its export and the personal
// board; changing a rule may not touch a locked month, so a closed timesheet never moves.

export type StandardWorkdayInput = {
  name: string;
  departmentIds?: string[];
  positionIds?: string[];
  mode: "schedule" | "auto" | "fixed";
  fixedUnits?: number | null;
  adjustUnits?: number | null;
  effectiveFrom: string;
  note?: string | null;
};

const monthLabel = (month: string) => `${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;

function toRule(row: StandardWorkdayRule): StandardRule {
  return {
    id: row.id,
    name: row.name,
    departmentIds: row.departmentIds,
    positionIds: row.positionIds,
    mode: row.mode,
    fixedUnits: row.fixedUnits === null ? null : Number(row.fixedUnits),
    adjustUnits: Number(row.adjustUnits),
    effectiveFrom: row.effectiveFrom
  };
}

@Injectable()
export class StandardWorkdayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  // The rules, and the last locked month: rules may only start after it.
  async findAll() {
    const [rows, locked] = await Promise.all([
      this.prisma.standardWorkdayRule.findMany({ orderBy: [{ effectiveFrom: "desc" }, { name: "asc" }] }),
      this.prisma.attendancePeriod.findFirst({ where: { status: AttendancePeriodStatus.locked }, orderBy: { month: "desc" }, select: { month: true } })
    ]);
    return { items: rows.map((row) => ({ ...toRule(row), note: row.note, updatedAt: row.updatedAt })), lockedThrough: locked?.month ?? null };
  }

  async create(input: StandardWorkdayInput, actorId?: string) {
    const data = await this.validate(input);
    await this.assertNoLockedMonthFrom(data.effectiveFrom);
    await this.assertNoClash(data, null);
    const row = await this.prisma.standardWorkdayRule.create({ data });
    await this.writeAudit("standard_workday.create", row.id, null, row, actorId);
    return toRule(row);
  }

  async update(id: string, input: StandardWorkdayInput, actorId?: string) {
    const before = await this.find(id);
    const data = await this.validate(input);
    await this.assertNoLockedMonthFrom(before.effectiveFrom < data.effectiveFrom ? before.effectiveFrom : data.effectiveFrom);
    await this.assertNoClash(data, id);
    const row = await this.prisma.standardWorkdayRule.update({ where: { id }, data });
    await this.writeAudit("standard_workday.update", id, before, row, actorId);
    return toRule(row);
  }

  async remove(id: string, actorId?: string) {
    const before = await this.find(id);
    await this.assertNoLockedMonthFrom(before.effectiveFrom);
    await this.prisma.standardWorkdayRule.delete({ where: { id } });
    await this.writeAudit("standard_workday.delete", id, before, null, actorId);
    return { id, deleted: true };
  }

  // Loads the month's rules once and returns a function giving one person's standard.
  async resolverFor(month: string) {
    const [rows, policy] = await Promise.all([
      this.prisma.standardWorkdayRule.findMany({ where: { effectiveFrom: { lte: month } } }),
      this.prisma.attendancePolicy.findUnique({ where: { id: "default" }, select: { defaultShift: true } })
    ]);
    const rules = rows.map(toRule);
    const shift = policy?.defaultShift;
    const hoursPerUnit = shift && Number(shift.workUnits) > 0 ? requiredMinutesFor(shift) / 60 / Number(shift.workUnits) : 8;
    return (target: StandardTarget, schedule: { units: number; minutes: number }) => standardFor(pickRule(rules, target, month), month, schedule, hoursPerUnit);
  }

  private async find(id: string) {
    const row = await this.prisma.standardWorkdayRule.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy quy tắc công chuẩn.");
    return row;
  }

  private async validate(input: StandardWorkdayInput) {
    const departmentIds = [...new Set(input.departmentIds ?? [])];
    const positionIds = [...new Set(input.positionIds ?? [])];
    if (input.mode === "fixed" && (input.fixedUnits === null || input.fixedUnits === undefined)) throw new BadRequestException("Nhập số công chuẩn cố định.");
    const [departments, positions] = await Promise.all([
      departmentIds.length ? this.prisma.department.count({ where: { id: { in: departmentIds } } }) : 0,
      positionIds.length ? this.prisma.jobPosition.count({ where: { id: { in: positionIds } } }) : 0
    ]);
    if (departments !== departmentIds.length) throw new BadRequestException("Có phòng ban không tồn tại.");
    if (positions !== positionIds.length) throw new BadRequestException("Có vị trí không tồn tại.");
    return {
      name: input.name.trim(),
      departmentIds,
      positionIds,
      mode: input.mode,
      fixedUnits: input.mode === "fixed" ? input.fixedUnits! : null,
      adjustUnits: input.mode === "auto" ? (input.adjustUnits ?? 0) : 0,
      effectiveFrom: input.effectiveFrom,
      note: input.note?.trim() || null
    };
  }

  private async assertNoLockedMonthFrom(month: string) {
    const locked = await this.prisma.attendancePeriod.findFirst({
      where: { status: AttendancePeriodStatus.locked, month: { gte: month } },
      orderBy: { month: "desc" }
    });
    if (locked) {
      throw new ConflictException(`Kỳ công tháng ${monthLabel(locked.month)} đã chốt. Đặt "Áp dụng từ" sau tháng ${monthLabel(locked.month)} hoặc mở chốt kỳ công trước.`);
    }
  }

  private async assertNoClash(data: Pick<StandardRule, "departmentIds" | "positionIds" | "effectiveFrom">, ignoreId: string | null) {
    const others = await this.prisma.standardWorkdayRule.findMany({ where: { effectiveFrom: data.effectiveFrom, ...(ignoreId ? { id: { not: ignoreId } } : {}) } });
    const clash = others.find((other) => overlaps(data, toRule(other)));
    if (clash) throw new ConflictException(`Trùng nhóm với quy tắc "${clash.name}" cùng tháng áp dụng. Sửa quy tắc đó hoặc thu hẹp nhóm.`);
  }

  private async writeAudit(action: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    const json = (value: unknown) => (value === null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue));
    await this.prisma.auditLog.create({
      data: { ...this.audit.contextFields(), actorId, action, entityType: "StandardWorkdayRule", entityId, beforeValue: json(before), afterValue: json(after) }
    });
  }
}
