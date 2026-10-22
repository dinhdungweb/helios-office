import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { HolidayType, Prisma, type Holiday } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { CreateHolidayDto, UpdateHolidayDto } from "./holidays.dto";

// Solar public holidays fixed by the Labour Code 2019, Article 112. Lunar ones (Tết Nguyên đán, Giỗ
// Tổ) and the day next to National Day move every year; HR enters those from the government schedule.
export const FIXED_SOLAR_HOLIDAYS = [
  { month: 1, day: 1, name: "Tết Dương lịch" },
  { month: 4, day: 30, name: "Ngày Chiến thắng" },
  { month: 5, day: 1, name: "Quốc tế Lao động" },
  { month: 9, day: 2, name: "Quốc khánh" }
] as const;

// Holidays are calendar dates with no time zone; they are kept as UTC midnight in a DATE column.
export function parseCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`Ngày không hợp lệ: ${value}`);
  }
  return date;
}

function toView(holiday: Holiday) {
  return { ...holiday, date: holiday.date.toISOString().slice(0, 10) };
}

// Holidays, make-up working days and company days off (AT-10). Changing one recalculates the
// attendance of that date once the engine exists (AT-12).
@Injectable()
export class HolidaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async findByYear(year = new Date().getFullYear()) {
    const holidays = await this.prisma.holiday.findMany({
      where: { date: { gte: parseCalendarDate(`${year}-01-01`), lte: parseCalendarDate(`${year}-12-31`) } },
      orderBy: { date: "asc" }
    });
    return holidays.map(toView);
  }

  async create(dto: CreateHolidayDto, actorId?: string) {
    try {
      const holiday = await this.prisma.holiday.create({ data: this.data(dto) });
      await this.writeAudit("holiday.create", holiday.id, null, holiday, actorId);
      return toView(holiday);
    } catch (error) {
      throw this.uniqueDate(error);
    }
  }

  async update(id: string, dto: UpdateHolidayDto, actorId?: string) {
    const before = await this.find(id);
    const merged = { date: before.date.toISOString().slice(0, 10), name: before.name, type: before.type, paid: before.paid, note: before.note, ...dto };

    try {
      const holiday = await this.prisma.holiday.update({ where: { id }, data: this.data(merged) });
      await this.writeAudit("holiday.update", id, before, holiday, actorId);
      return toView(holiday);
    } catch (error) {
      throw this.uniqueDate(error);
    }
  }

  async remove(id: string, actorId?: string) {
    const holiday = await this.find(id);
    await this.prisma.holiday.delete({ where: { id } });
    await this.writeAudit("holiday.delete", id, holiday, null, actorId);
    return { id, deleted: true };
  }

  // Adds the fixed solar holidays of a year, leaving dates that already have an entry alone.
  async addFixedHolidays(year: number, actorId?: string) {
    const result = await this.prisma.holiday.createMany({
      data: FIXED_SOLAR_HOLIDAYS.map((holiday) => ({
        date: parseCalendarDate(`${year}-${String(holiday.month).padStart(2, "0")}-${String(holiday.day).padStart(2, "0")}`),
        name: holiday.name,
        type: HolidayType.holiday,
        paid: true
      })),
      skipDuplicates: true
    });
    await this.writeAudit("holiday.add_fixed", String(year), null, { year, added: result.count }, actorId);
    return { year, added: result.count };
  }

  private data(dto: CreateHolidayDto) {
    const type = dto.type ?? HolidayType.holiday;
    return {
      date: parseCalendarDate(dto.date),
      name: dto.name.trim(),
      type,
      // A make-up working day is worked, so "paid" does not apply to it.
      paid: type === HolidayType.compensatory_workday ? false : dto.paid ?? true,
      note: dto.note?.trim() || null
    };
  }

  private async find(id: string) {
    const holiday = await this.prisma.holiday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException(`Holiday ${id} was not found`);
    return holiday;
  }

  private uniqueDate(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
      ? new ConflictException("Ngày này đã có trong lịch nghỉ lễ.")
      : error;
  }

  private async writeAudit(action: string, entityId: string, before: unknown, after: unknown, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        ...this.audit.contextFields(),
        actorId,
        action,
        entityType: "Holiday",
        entityId,
        beforeValue: before === null ? undefined : (JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue),
        afterValue: after === null ? undefined : (JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue)
      }
    });
  }
}
