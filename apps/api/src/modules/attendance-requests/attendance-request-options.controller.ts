import { Controller, Get, NotFoundException, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequestOptionsQueryDto } from "./attendance-requests.dto";
import { dbDate, resolveDay } from "./request-day";

// What the overtime, check-in/out and shift change forms show for a date (LV-18 → LV-20): the
// signed-in person's shift that day, what the timesheet recorded, and the shifts they may change to.
// Own data only, so signing in is enough.
@ApiTags("requests")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("attendance-requests")
export class AttendanceRequestOptionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("options")
  @ApiOkResponse({ description: "My shift, holiday and recorded punches on the date, plus the active shifts." })
  async options(@CurrentUser() user: AuthenticatedUser, @Query() query: RequestOptionsQueryDto) {
    const employeeId = user.account?.employeeId;
    if (!employeeId) throw new NotFoundException("Tài khoản chưa gắn với hồ sơ nhân sự.");

    const [day, recorded, shifts] = await Promise.all([
      resolveDay(this.prisma as never, employeeId, query.date),
      this.prisma.attendanceDay.findUnique({
        where: { employeeId_workDate: { employeeId, workDate: dbDate(query.date) } },
        select: { checkIn: true, checkOut: true, status: true, workUnits: true }
      }),
      this.prisma.shift.findMany({
        where: { status: "active" },
        select: { id: true, code: true, name: true, startMinute: true, endMinute: true },
        orderBy: [{ startMinute: "asc" }, { code: "asc" }]
      })
    ]);

    return {
      date: query.date,
      employed: day.employed,
      shift: day.shift ? { id: day.shift.id, code: day.shift.code, name: day.shift.name, startMinute: day.shift.startMinute, endMinute: day.shift.endMinute } : null,
      holiday: day.holiday,
      recorded: recorded ? { checkIn: recorded.checkIn, checkOut: recorded.checkOut, status: recorded.status, workUnits: Number(recorded.workUnits) } : null,
      shifts
    };
  }
}
