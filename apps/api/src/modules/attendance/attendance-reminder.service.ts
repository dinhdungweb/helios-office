import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { AttendanceDayStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { NotificationsService } from "../notifications/notifications.service";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import { AttendancePeriodService } from "./attendance-period.service";
import { addDays, localDate, zonedInstant } from "./engine/zoned-time";

// AT-23: tells people whose day had a missing check-in or check-out, the morning after. The
// worker calls tick() every few minutes; once the policy's reminder time has passed it claims
// yesterday in AttendanceReminderRun, so the reminders go out once per day. Days off and
// holidays never carry a missing-punch status, so nobody is reminded for them.

export const MISSING_PUNCH_EVENT = "attendance.missing_punch";
const MISSING_STATUSES = [AttendanceDayStatus.missing_checkin, AttendanceDayStatus.missing_checkout];

const dbDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
const dayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

function hhmm(value: Date | null, timeZone: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(value);
}

@Injectable()
export class AttendanceReminderService {
  private readonly logger = new Logger("AttendanceReminder");

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculation: AttendanceCalculationService,
    private readonly periods: AttendancePeriodService,
    private readonly notifications: NotificationsService
  ) {}

  async tick(now = Date.now()) {
    const policy = await this.calculation.getPolicy();
    if (!policy.missingPunchReminder) return null;
    const today = localDate(now, policy.timezone);
    const [hour, minute] = policy.missingPunchReminderTime.split(":").map(Number);
    if (now < zonedInstant(today, hour * 60 + minute, policy.timezone)) return null;

    const workDate = addDays(today, -1);
    try {
      await this.prisma.attendanceReminderRun.create({ data: { workDate, trigger: "auto" } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
      throw error;
    }
    const result = await this.deliver(workDate, policy.timezone);
    if (result.notified > 0) this.logger.log(`Reminded ${result.notified} people about missing punches on ${workDate}`);
    return result;
  }

  // HR sends (again) by hand, for yesterday or an earlier date.
  async runNow(user: AuthenticatedUser, date?: string) {
    const timeZone = await this.calculation.timezone();
    const today = localDate(Date.now(), timeZone);
    const workDate = date ?? addDays(today, -1);
    if (workDate >= today) throw new BadRequestException("Chỉ nhắc được cho ngày đã qua.");
    const triggeredById = user.account?.employeeId ?? user.account?.id ?? null;
    await this.prisma.attendanceReminderRun.upsert({
      where: { workDate },
      create: { workDate, trigger: "manual", triggeredById },
      update: { trigger: "manual", triggeredById, startedAt: new Date(), finishedAt: null, notified: 0, error: null }
    });
    return this.deliver(workDate, timeZone);
  }

  recent(limit = 10) {
    return this.prisma.attendanceReminderRun.findMany({ orderBy: { workDate: "desc" }, take: limit });
  }

  private async deliver(workDate: string, timeZone: string) {
    try {
      // A locked month is final; reminding would only ask for changes nobody can make.
      if ((await this.periods.lockedMonths([workDate.slice(0, 7)])).size > 0) {
        await this.finish(workDate, 0, "Kỳ công đã chốt, không nhắc.");
        return { workDate, notified: 0, skipped: "locked" as const };
      }
      const days = await this.prisma.attendanceDay.findMany({
        where: { workDate: dbDate(workDate), status: { in: MISSING_STATUSES }, employee: { status: { not: "resigned" } } },
        select: { employeeId: true, status: true, checkIn: true, checkOut: true, shift: { select: { code: true, name: true } } },
        orderBy: { employeeId: "asc" }
      });
      for (const day of days) {
        const shift = day.shift ? ` ca ${day.shift.name || day.shift.code}` : "";
        const missing = day.status === AttendanceDayStatus.missing_checkin ? "giờ vào" : "giờ ra";
        const seen = day.status === AttendanceDayStatus.missing_checkin ? hhmm(day.checkOut, timeZone) : hhmm(day.checkIn, timeZone);
        await this.notifications.notify({
          event: MISSING_PUNCH_EVENT,
          recipients: { employeeIds: [day.employeeId] },
          title: `Bạn quên chấm ${missing} ngày ${dayMonth(workDate)}`,
          body: `Ngày ${dayMonth(workDate)}${shift} chỉ có ${seen ? `log lúc ${seen}` : "một lần chấm"}, thiếu ${missing}. Báo HR để bổ sung công.`,
          link: `/user/attendance?month=${workDate.slice(0, 7)}`,
          data: { workDate, status: day.status }
        });
      }
      await this.finish(workDate, days.length, null);
      return { workDate, notified: days.length };
    } catch (error) {
      await this.finish(workDate, 0, error instanceof Error ? error.message.slice(0, 500) : String(error)).catch(() => undefined);
      throw error;
    }
  }

  private finish(workDate: string, notified: number, error: string | null) {
    return this.prisma.attendanceReminderRun.update({ where: { workDate }, data: { finishedAt: new Date(), notified, error } });
  }
}
