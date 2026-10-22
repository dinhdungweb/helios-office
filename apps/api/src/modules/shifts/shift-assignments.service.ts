import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EmployeeStatus, JobCatalogStatus, Prisma } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { localDate } from "../attendance/engine/zoned-time";
import { parseCalendarDate } from "./holidays.service";
import { planBulkCells, previewBulk, type BulkCell, type BulkRule } from "./shift-bulk";
import { patternDays } from "./shift-patterns.service";
import { datesBetween, resolveDayShift } from "./shift-resolver";
import { MAX_BULK_DAYS, type AssignShiftsDto, type BulkAssignDto, type ClearAssignmentsDto, type ScheduleQueryDto } from "./shift-assignments.dto";
import { ATTENDANCE_READ_PERMISSIONS, ATTENDANCE_SETUP_PERMISSION } from "./shifts.controller";

const MAX_RANGE_DAYS = 62;
const MAX_CELLS = 5000;
const MAX_BULK_CELLS = 20000;

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}

// Shift scheduling (AT-07): the week/month grid and per-person, per-date assignments. Everyone you
// schedule must be in your data scope for the attendance setup permission; people outside it are
// reported as missing.
@Injectable()
export class ShiftAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScope: DataScopeService,
    private readonly audit: AuditService
  ) {}

  async schedule(user: AuthenticatedUser, query: ScheduleQueryDto) {
    const dates = this.range(query.from, query.to);
    const scope = await this.dataScope.resolve(user, ATTENDANCE_READ_PERMISSIONS);
    const from = parseCalendarDate(query.from);
    const to = parseCalendarDate(query.to);

    const [employees, assignments, holidays, policy, shifts] = await Promise.all([
      this.prisma.employee.findMany({
        where: {
          AND: [
            this.dataScope.employeeWhere(scope),
            query.departmentId ? { departmentId: query.departmentId } : {},
            // People still employed at some point in the range.
            { startDate: { lte: to } },
            { OR: [{ endDate: null }, { endDate: { gte: from } }] },
            { status: { not: EmployeeStatus.resigned } }
          ]
        },
        select: { id: true, code: true, fullName: true, department: { select: { id: true, name: true, defaultShiftId: true } } },
        orderBy: [{ department: { name: "asc" } }, { code: "asc" }]
      }),
      this.prisma.shiftAssignment.findMany({
        where: { date: { gte: from, lte: to } },
        select: { id: true, employeeId: true, date: true, shiftId: true, note: true }
      }),
      this.prisma.holiday.findMany({ where: { date: { gte: from, lte: to } } }),
      this.prisma.attendancePolicy.findUnique({ where: { id: "default" } }),
      this.prisma.shift.findMany({ orderBy: [{ status: "asc" }, { startMinute: "asc" }] })
    ]);

    const assignmentByCell = new Map(assignments.map((assignment) => [`${assignment.employeeId}:${dateKey(assignment.date)}`, assignment]));
    const holidayByDate = new Map(holidays.map((holiday) => [dateKey(holiday.date), holiday]));

    return {
      from: query.from,
      to: query.to,
      shifts: shifts.map((shift) => ({
        id: shift.id,
        code: shift.code,
        name: shift.name,
        color: shift.color,
        startMinute: shift.startMinute,
        endMinute: shift.endMinute,
        status: shift.status
      })),
      holidays: holidays.map((holiday) => ({ date: dateKey(holiday.date), name: holiday.name, type: holiday.type })),
      employees: employees.map((employee) => ({
        id: employee.id,
        code: employee.code,
        fullName: employee.fullName,
        department: { id: employee.department.id, name: employee.department.name },
        days: dates.map((date) => {
          const assignment = assignmentByCell.get(`${employee.id}:${date}`);
          const resolved = resolveDayShift({
            date,
            assignment: assignment ? { shiftId: assignment.shiftId } : undefined,
            departmentDefaultShiftId: employee.department.defaultShiftId,
            companyDefaultShiftId: policy?.defaultShiftId,
            workWeekdays: policy?.workWeekdays ?? [1, 2, 3, 4, 5],
            holiday: holidayByDate.get(date)
          });
          return { date, ...resolved, assignmentId: assignment?.id ?? null, note: assignment?.note ?? null };
        })
      }))
    };
  }

  async assign(user: AuthenticatedUser, dto: AssignShiftsDto) {
    this.limitCells(dto.employeeIds.length, dto.dates.length);
    await this.assertInScope(user, dto.employeeIds);

    if (dto.shiftId) {
      const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId }, select: { status: true } });
      if (!shift || shift.status !== JobCatalogStatus.active) {
        throw new BadRequestException("Chỉ xếp được ca đang hoạt động.");
      }
    }

    const actorId = user.account?.employeeId ?? undefined;
    const dates = dto.dates.map(parseCalendarDate);
    await this.prisma.$transaction(
      dto.employeeIds.flatMap((employeeId) =>
        dates.map((date) =>
          this.prisma.shiftAssignment.upsert({
            where: { employeeId_date: { employeeId, date } },
            create: { employeeId, date, shiftId: dto.shiftId, note: dto.note ?? null, createdById: actorId },
            update: { shiftId: dto.shiftId, note: dto.note ?? null }
          })
        )
      )
    );
    await this.writeAudit("shift_assignment.assign", "ShiftAssignment", "bulk", null, {
      employeeIds: dto.employeeIds,
      dates: dto.dates,
      shiftId: dto.shiftId
    }, actorId);

    return { assigned: dto.employeeIds.length * dto.dates.length };
  }

  // Back to the department/company default on those dates.
  async clear(user: AuthenticatedUser, dto: ClearAssignmentsDto) {
    this.limitCells(dto.employeeIds.length, dto.dates.length);
    await this.assertInScope(user, dto.employeeIds);

    const result = await this.prisma.shiftAssignment.deleteMany({
      where: { employeeId: { in: dto.employeeIds }, date: { in: dto.dates.map(parseCalendarDate) } }
    });
    await this.writeAudit("shift_assignment.clear", "ShiftAssignment", "bulk", null, { employeeIds: dto.employeeIds, dates: dto.dates }, user.account?.employeeId ?? undefined);
    return { cleared: result.count };
  }

  // AT-08: one shift on chosen weekdays, or a repeating pattern, over a date range for people and
  // whole departments in scope. `preview` only counts; `overwrite: false` keeps existing assignments.
  async bulk(user: AuthenticatedUser, dto: BulkAssignDto) {
    parseCalendarDate(dto.from);
    parseCalendarDate(dto.to);
    if (dto.to < dto.from) throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu.");
    if (datesBetween(dto.from, dto.to).length > MAX_BULK_DAYS) throw new BadRequestException(`Xếp tối đa ${MAX_BULK_DAYS} ngày một lần.`);
    if (!dto.employeeIds?.length && !dto.departmentIds?.length) throw new BadRequestException("Chọn ít nhất một nhân sự hoặc phòng ban.");
    if (dto.employeeIds?.length) await this.assertInScope(user, dto.employeeIds);

    const rule = await this.bulkRule(dto);
    const scope = await this.dataScope.resolve(user, [ATTENDANCE_SETUP_PERMISSION]);
    const from = parseCalendarDate(dto.from);
    const to = parseCalendarDate(dto.to);
    const [policy, employees] = await Promise.all([
      this.prisma.attendancePolicy.findUnique({ where: { id: "default" }, select: { timezone: true } }),
      this.prisma.employee.findMany({
        where: {
          AND: [
            this.dataScope.employeeWhere(scope),
            { OR: [{ id: { in: dto.employeeIds ?? [] } }, { departmentId: { in: dto.departmentIds ?? [] } }] },
            { status: { not: EmployeeStatus.resigned } },
            { startDate: { lte: to } },
            { OR: [{ endDate: null }, { endDate: { gte: from } }] }
          ]
        },
        select: { id: true, startDate: true, endDate: true }
      })
    ]);
    const timeZone = policy?.timezone ?? "Asia/Ho_Chi_Minh";

    const cells = planBulkCells(
      employees.map((employee) => ({
        id: employee.id,
        startDate: localDate(employee.startDate.getTime(), timeZone),
        endDate: employee.endDate ? localDate(employee.endDate.getTime(), timeZone) : null
      })),
      dto.from,
      dto.to,
      rule
    );
    if (cells.length > MAX_BULK_CELLS) {
      throw new BadRequestException(`Mỗi lần xếp tối đa ${MAX_BULK_CELLS} ô (người × ngày), lần này là ${cells.length}. Hãy chia nhỏ khoảng ngày hoặc nhóm người.`);
    }

    const existingRows = await this.prisma.shiftAssignment.findMany({
      where: { employeeId: { in: employees.map((employee) => employee.id) }, date: { gte: from, lte: to } },
      select: { employeeId: true, date: true, shiftId: true }
    });
    const existing = new Map(existingRows.map((row) => [`${row.employeeId}:${dateKey(row.date)}`, row.shiftId]));
    const counts = previewBulk(cells, existing);
    const overwrite = dto.overwrite ?? true;
    const summary = { ...counts, employees: employees.length, written: counts.create + (overwrite ? counts.overwrite : 0) };
    if (dto.preview) return { ...summary, saved: false };

    const key = (cell: BulkCell) => `${cell.employeeId}:${cell.date}`;
    const replaced = overwrite ? cells.filter((cell) => existing.has(key(cell)) && existing.get(key(cell)) !== cell.shiftId) : [];
    const created = cells.filter((cell) => !existing.has(key(cell)));
    const actorId = user.account?.employeeId ?? undefined;
    const rows = [...created, ...replaced].map((cell) => ({
      employeeId: cell.employeeId,
      date: parseCalendarDate(cell.date),
      shiftId: cell.shiftId,
      note: dto.note ?? null,
      createdById: actorId
    }));

    const byEmployee = new Map<string, Date[]>();
    replaced.forEach((cell) => byEmployee.set(cell.employeeId, [...(byEmployee.get(cell.employeeId) ?? []), parseCalendarDate(cell.date)]));
    const deletes = [...byEmployee.entries()].map(([employeeId, dates]) => ({ employeeId, date: { in: dates } }));

    await this.prisma.$transaction([
      ...chunk(deletes, 200).map((group) => this.prisma.shiftAssignment.deleteMany({ where: { OR: group } })),
      ...chunk(rows, 5000).map((group) => this.prisma.shiftAssignment.createMany({ data: group, skipDuplicates: true }))
    ]);
    await this.writeAudit("shift_assignment.bulk", "ShiftAssignment", "bulk", null, {
      from: dto.from,
      to: dto.to,
      mode: dto.mode,
      shiftId: dto.shiftId,
      patternId: dto.patternId,
      weekdays: dto.weekdays,
      employeeIds: dto.employeeIds,
      departmentIds: dto.departmentIds,
      overwriteExisting: overwrite,
      ...summary
    }, actorId);

    return { ...summary, saved: true };
  }

  private async bulkRule(dto: BulkAssignDto): Promise<BulkRule> {
    if (dto.mode === "shift") {
      if (dto.shiftId === undefined) throw new BadRequestException("Chọn ca hoặc ngày nghỉ.");
      if (dto.shiftId) await this.assertActiveShifts([dto.shiftId]);
      return { kind: "shift", shiftId: dto.shiftId, weekdays: dto.weekdays ?? [] };
    }

    const pattern = await this.prisma.shiftPattern.findUnique({ where: { id: dto.patternId! } });
    if (!pattern || pattern.status !== JobCatalogStatus.active) throw new NotFoundException("Không tìm thấy mẫu xếp ca.");
    const days = patternDays(pattern);
    await this.assertActiveShifts(days.filter((day): day is string => day !== null));
    return { kind: "pattern", days, anchor: dto.from };
  }

  private async assertActiveShifts(ids: string[]) {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    const active = await this.prisma.shift.count({ where: { id: { in: unique }, status: JobCatalogStatus.active } });
    if (active !== unique.length) throw new BadRequestException("Chỉ xếp được ca đang hoạt động.");
  }

  async remove(user: AuthenticatedUser, id: string) {
    const assignment = await this.prisma.shiftAssignment.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundException(`Shift assignment ${id} was not found`);
    await this.assertInScope(user, [assignment.employeeId]);

    await this.prisma.shiftAssignment.delete({ where: { id } });
    await this.writeAudit("shift_assignment.delete", "ShiftAssignment", id, { ...assignment, date: dateKey(assignment.date) }, null, user.account?.employeeId ?? undefined);
    return { id, deleted: true };
  }

  async setDepartmentDefault(user: AuthenticatedUser, departmentId: string, shiftId: string | null) {
    const scope = await this.dataScope.resolve(user, [ATTENDANCE_SETUP_PERMISSION]);
    const department = await this.prisma.department.findUnique({ where: { id: departmentId }, select: { id: true, defaultShiftId: true } });

    if (!department || !this.dataScope.departmentInScope(scope, departmentId)) {
      throw new NotFoundException(`Department ${departmentId} was not found`);
    }
    if (shiftId) {
      const shift = await this.prisma.shift.findUnique({ where: { id: shiftId }, select: { status: true } });
      if (!shift || shift.status !== JobCatalogStatus.active) throw new BadRequestException("Ca mặc định phải là một ca đang hoạt động.");
    }

    const updated = await this.prisma.department.update({
      where: { id: departmentId },
      data: { defaultShiftId: shiftId },
      select: { id: true, name: true, defaultShiftId: true }
    });
    await this.writeAudit("department.default_shift", "Department", departmentId, department, updated, user.account?.employeeId ?? undefined);
    return updated;
  }

  private range(from: string, to: string) {
    parseCalendarDate(from);
    parseCalendarDate(to);
    if (to < from) throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu.");
    const dates = datesBetween(from, to);
    if (dates.length > MAX_RANGE_DAYS) throw new BadRequestException(`Xem tối đa ${MAX_RANGE_DAYS} ngày một lần.`);
    return dates;
  }

  private limitCells(employees: number, dates: number) {
    if (employees * dates > MAX_CELLS) {
      throw new BadRequestException(`Mỗi lần xếp tối đa ${MAX_CELLS} ô (người × ngày). Hãy chia nhỏ.`);
    }
  }

  private async assertInScope(user: AuthenticatedUser, employeeIds: string[]) {
    const scope = await this.dataScope.resolve(user, [ATTENDANCE_SETUP_PERMISSION]);
    const visible = await this.prisma.employee.count({ where: { AND: [{ id: { in: employeeIds } }, this.dataScope.employeeWhere(scope)] } });
    if (visible !== employeeIds.length) {
      throw new NotFoundException("Một số nhân sự không tồn tại hoặc ngoài phạm vi của bạn.");
    }
  }

  private async writeAudit(action: string, entityType: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    const json = (value: unknown) => (value === null ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue));
    await this.prisma.auditLog.create({
      data: { ...this.audit.contextFields(), actorId, action, entityType, entityId, beforeValue: json(before), afterValue: json(after) }
    });
  }
}
