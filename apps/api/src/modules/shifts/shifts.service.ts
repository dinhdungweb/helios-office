import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { JobCatalogStatus, Prisma, type Shift } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AttendanceRecalcService } from "../attendance/attendance-recalc.service";
import { requiredMinutesFor, validateShiftTimes } from "./shift-rules";
import type { CreateShiftDto, UpdateAttendancePolicyDto, UpdateShiftDto } from "./shifts.dto";

const POLICY_ID = "default";
// Policy fields that never change a figure: reminders (AT-23) and scheduling limits (AT-28).
const NON_FIGURE_FIELDS = new Set(["missingPunchReminder", "missingPunchReminderTime", "shiftEditWindowDays", "shiftCreateAheadDays"]);

const SHIFT_USAGE = {
  _count: { select: { departmentsDefault: true, policiesDefault: true, shiftAssignments: true } }
} satisfies Prisma.ShiftInclude;

type ShiftWithUsage = Prisma.ShiftGetPayload<{ include: typeof SHIFT_USAGE }>;

function toView(shift: ShiftWithUsage) {
  const { _count, workUnits, ...rest } = shift;
  return {
    ...rest,
    workUnits: Number(workUnits),
    requiredMinutes: requiredMinutesFor(rest),
    usage: { departmentDefaults: _count.departmentsDefault, companyDefault: _count.policiesDefault > 0, assignments: _count.shiftAssignments }
  };
}

// Shift catalogue (AT-05, AT-06) and the company attendance policy. Shifts in use are archived, not
// deleted, so past schedules and results keep their meaning.
@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly recalc: AttendanceRecalcService
  ) {}

  async findAll(includeArchived = false) {
    const shifts = await this.prisma.shift.findMany({
      where: includeArchived ? undefined : { status: JobCatalogStatus.active },
      include: SHIFT_USAGE,
      orderBy: [{ status: "asc" }, { startMinute: "asc" }, { code: "asc" }]
    });

    return shifts.map(toView);
  }

  async create(dto: CreateShiftDto, actorId?: string) {
    const data = this.shiftData(dto);
    await this.assertTargets(data);

    try {
      const shift = await this.prisma.shift.create({ data, include: SHIFT_USAGE });
      await this.writeAudit("shift.create", "Shift", shift.id, null, shift, actorId);
      return toView(shift);
    } catch (error) {
      throw this.uniqueCode(error);
    }
  }

  async update(id: string, dto: UpdateShiftDto, actorId?: string) {
    const before = await this.findShift(id);

    if (before.status === JobCatalogStatus.archived) {
      throw new ConflictException("Ca đã lưu trữ, khôi phục trước khi sửa.");
    }

    const data = this.shiftData({ ...this.asDto(before), ...dto });
    await this.assertTargets(data);

    try {
      const shift = await this.prisma.shift.update({ where: { id }, data, include: SHIFT_USAGE });
      await this.writeAudit("shift.update", "Shift", id, before, shift, actorId);
      await this.recalcIfUsed(before, actorId, shift.autoDetect);
      return toView(shift);
    } catch (error) {
      throw this.uniqueCode(error);
    }
  }

  async archive(id: string, actorId?: string) {
    const before = await this.findShift(id);
    if (before.status === JobCatalogStatus.archived) return toView(before);

    if (before._count.policiesDefault > 0 || before._count.departmentsDefault > 0) {
      throw new ConflictException("Ca đang là ca mặc định của công ty hoặc phòng ban. Đổi ca mặc định trước khi lưu trữ.");
    }

    const shift = await this.prisma.shift.update({
      where: { id },
      data: { status: JobCatalogStatus.archived, archivedAt: new Date() },
      include: SHIFT_USAGE
    });
    await this.writeAudit("shift.archive", "Shift", id, before, shift, actorId);
    await this.recalcIfUsed(before, actorId);
    return toView(shift);
  }

  async restore(id: string, actorId?: string) {
    const before = await this.findShift(id);
    if (before.status === JobCatalogStatus.active) return toView(before);

    const shift = await this.prisma.shift.update({
      where: { id },
      data: { status: JobCatalogStatus.active, archivedAt: null },
      include: SHIFT_USAGE
    });
    await this.writeAudit("shift.restore", "Shift", id, before, shift, actorId);
    await this.recalcIfUsed(before, actorId);
    return toView(shift);
  }

  // Only a shift nothing points at can go; anything used is archived instead, so past schedules
  // keep their meaning.
  async remove(id: string, actorId?: string) {
    const shift = await this.findShift(id);

    if (shift._count.policiesDefault > 0 || shift._count.departmentsDefault > 0) {
      throw new ConflictException("Ca đang được dùng làm ca mặc định, hãy lưu trữ thay vì xoá.");
    }
    if (shift._count.shiftAssignments > 0) {
      throw new ConflictException("Ca đã được xếp cho nhân sự, hãy lưu trữ thay vì xoá.");
    }

    await this.prisma.shift.delete({ where: { id } });
    await this.writeAudit("shift.delete", "Shift", id, shift, null, actorId);
    return { id, deleted: true };
  }

  async getPolicy() {
    return this.prisma.attendancePolicy.upsert({
      where: { id: POLICY_ID },
      create: { id: POLICY_ID },
      update: {},
      include: { defaultShift: { select: { id: true, code: true, name: true, status: true } } }
    });
  }

  async updatePolicy(dto: UpdateAttendancePolicyDto, actorId?: string) {
    const before = await this.getPolicy();

    if (dto.timezone !== undefined && !this.isTimeZone(dto.timezone)) {
      throw new BadRequestException(`Múi giờ không hợp lệ: ${dto.timezone}`);
    }

    if (dto.defaultShiftId) {
      const shift = await this.prisma.shift.findUnique({ where: { id: dto.defaultShiftId }, select: { status: true } });
      if (!shift || shift.status !== JobCatalogStatus.active) {
        throw new BadRequestException("Ca mặc định phải là một ca đang hoạt động.");
      }
    }

    const { defaultShiftId, workWeekdays, ...rest } = dto;
    const policy = await this.prisma.attendancePolicy.update({
      where: { id: POLICY_ID },
      data: {
        ...rest,
        ...(workWeekdays ? { workWeekdays: [...workWeekdays].sort((a, b) => a - b) } : {}),
        ...(defaultShiftId !== undefined ? { defaultShiftId } : {})
      },
      include: { defaultShift: { select: { id: true, code: true, name: true, status: true } } }
    });
    await this.writeAudit("attendance_policy.update", "AttendancePolicy", POLICY_ID, before, policy, actorId);
    // Only a rule that changed value can move a figure; the form sends every field, and the
    // reminder settings (AT-23) never do.
    const affectsFigures = Object.keys(policy).some(
      (key) => key !== "updatedAt" && !NON_FIGURE_FIELDS.has(key) && JSON.stringify(policy[key as keyof typeof policy]) !== JSON.stringify(before[key as keyof typeof before])
    );
    if (affectsFigures) await this.recalc.rulesChanged("policy", actorId);

    return policy;
  }

  // A shift nobody works or defaults to cannot move any result.
  // A detected shift (AT-29) may apply to anyone on any day without an assignment, so changing one,
  // or turning detection on, recalculates as if it were in use.
  private async recalcIfUsed(shift: ShiftWithUsage, actorId?: string, detectedNow = false) {
    const used = shift._count.shiftAssignments > 0 || shift._count.departmentsDefault > 0 || shift._count.policiesDefault > 0 || shift.autoDetect || detectedNow;
    if (used) await this.recalc.rulesChanged("shift", actorId);
  }

  private shiftData(dto: CreateShiftDto) {
    const type = dto.type ?? "fixed";
    const times = {
      type,
      startMinute: dto.startMinute,
      endMinute: dto.endMinute,
      breakStartMinute: dto.breakStartMinute ?? null,
      breakEndMinute: dto.breakEndMinute ?? null,
      requiredMinutes: type === "flexible" ? dto.requiredMinutes ?? null : null
    };
    const errors = validateShiftTimes(times);

    if (errors.length > 0) {
      throw new BadRequestException(errors.join(" "));
    }

    return {
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      color: dto.color ?? null,
      ...times,
      // Fixed shifts store the derived figure too, so reports need not recompute it.
      requiredMinutes: requiredMinutesFor(times),
      workUnits: dto.workUnits ?? 1,
      lateGraceMinutes: dto.lateGraceMinutes ?? null,
      earlyGraceMinutes: dto.earlyGraceMinutes ?? null,
      lateCountMode: dto.lateCountMode ?? null,
      missingPunchMode: dto.missingPunchMode ?? null,
      punchWindowBeforeMinutes: dto.punchWindowBeforeMinutes ?? null,
      punchWindowAfterMinutes: dto.punchWindowAfterMinutes ?? null,
      description: dto.description?.trim() || null,
      autoDetect: dto.autoDetect ?? false,
      applyDepartmentIds: [...new Set(dto.applyDepartmentIds ?? [])],
      applyPositionIds: [...new Set(dto.applyPositionIds ?? [])]
    } satisfies Prisma.ShiftCreateInput;
  }

  private async assertTargets(data: { applyDepartmentIds: string[]; applyPositionIds: string[] }) {
    const [departments, positions] = await Promise.all([
      data.applyDepartmentIds.length ? this.prisma.department.count({ where: { id: { in: data.applyDepartmentIds } } }) : 0,
      data.applyPositionIds.length ? this.prisma.jobPosition.count({ where: { id: { in: data.applyPositionIds } } }) : 0
    ]);
    if (departments !== data.applyDepartmentIds.length) throw new BadRequestException("Có phòng ban áp dụng không tồn tại.");
    if (positions !== data.applyPositionIds.length) throw new BadRequestException("Có vị trí áp dụng không tồn tại.");
  }

  private asDto(shift: Shift): CreateShiftDto {
    return {
      code: shift.code,
      name: shift.name,
      type: shift.type,
      color: shift.color,
      startMinute: shift.startMinute,
      endMinute: shift.endMinute,
      breakStartMinute: shift.breakStartMinute,
      breakEndMinute: shift.breakEndMinute,
      requiredMinutes: shift.requiredMinutes,
      workUnits: Number(shift.workUnits),
      lateGraceMinutes: shift.lateGraceMinutes,
      earlyGraceMinutes: shift.earlyGraceMinutes,
      lateCountMode: shift.lateCountMode,
      missingPunchMode: shift.missingPunchMode,
      punchWindowBeforeMinutes: shift.punchWindowBeforeMinutes,
      punchWindowAfterMinutes: shift.punchWindowAfterMinutes,
      autoDetect: shift.autoDetect,
      applyDepartmentIds: shift.applyDepartmentIds,
      applyPositionIds: shift.applyPositionIds,
      description: shift.description
    };
  }

  private async findShift(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id }, include: SHIFT_USAGE });
    if (!shift) throw new NotFoundException(`Shift ${id} was not found`);
    return shift;
  }

  private uniqueCode(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
      ? new ConflictException("Mã ca đã tồn tại.")
      : error;
  }

  private isTimeZone(value: string) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }

  private async writeAudit(action: string, entityType: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        ...this.audit.contextFields(),
        actorId,
        action,
        entityType,
        entityId,
        beforeValue: before === null ? undefined : (JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue),
        afterValue: after === null ? undefined : (JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue)
      }
    });
  }
}
