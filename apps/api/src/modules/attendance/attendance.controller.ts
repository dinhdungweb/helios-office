import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { Public } from "../auth/public.decorator";
import { SkipAudit } from "../../common/audit/skip-audit.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceSyncDto } from "./attendance-sync.dto";
import { AttendanceSyncGuard } from "./attendance-sync.guard";
import { AdjustAttendanceDto, RevokeAdjustmentDto } from "./attendance-adjustment.dto";
import { ATTENDANCE_EDIT_PERMISSIONS, AttendanceAdjustmentsService } from "./attendance-adjustments.service";
import {
  AttendanceListQueryDto,
  ConfirmationWindowDto,
  ConfirmTimesheetDto,
  LockPeriodDto,
  MyAttendanceQueryDto,
  MyTimesheetQueryDto,
  ResolveFeedbackDto,
  TimesheetQueryDto,
  UnlockPeriodDto
} from "./attendance-query.dto";
import { AttendanceConfirmationService, CONFIRMATION_MANAGE_PERMISSIONS } from "./attendance-confirmation.service";
import { AttendancePeriodService } from "./attendance-period.service";
import { RawLogQueryDto, ResolveSyncErrorDto, SyncErrorQueryDto } from "./attendance-logs.dto";
import { AttendanceLogsService, RAW_LOG_PERMISSIONS, SYNC_ERROR_PERMISSIONS } from "./attendance-logs.service";
import { AttendanceTimesheetService, TIMESHEET_PERMISSIONS } from "./attendance-timesheet.service";
import { ATTENDANCE_VIEW_PERMISSIONS, AttendanceService } from "./attendance.service";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RecalculateAttendanceDto } from "./attendance-recalc.dto";
import { AttendanceRecalcService } from "./attendance-recalc.service";

const ATTENDANCE_MANAGE = "permission.attendance.manage";
const RECALC_PERMISSIONS = [ATTENDANCE_MANAGE, "permission.attendance-timesheets.manage"];
const MAX_RECALC_DAYS = 366;
const PERIOD_LOCK_PERMISSION = "permission.attendance-period.lock";

@ApiTags("attendance")
@Controller("attendance")
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly recalc: AttendanceRecalcService,
    private readonly adjustments: AttendanceAdjustmentsService,
    private readonly timesheets: AttendanceTimesheetService,
    private readonly periods: AttendancePeriodService,
    private readonly confirmations: AttendanceConfirmationService,
    private readonly logs: AttendanceLogsService,
    private readonly dataScope: DataScopeService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...ATTENDANCE_VIEW_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Calculated attendance days (AT-02) for people in scope, paginated; filter by range, department, person, status." })
  findDays(@CurrentUser() user: AuthenticatedUser, @Query() query: AttendanceListQueryDto) {
    return this.attendanceService.findDays(user, query);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "My calculated attendance days (AT-03) for a range, the current month by default." })
  findMyDays(@CurrentUser() user: AuthenticatedUser, @Query() query: MyAttendanceQueryDto) {
    return this.attendanceService.findMyDays(user, query);
  }

  @Get("timesheets")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...TIMESHEET_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Monthly timesheet (AT-16): people in scope × days of the month, with month totals; paginated by person." })
  timesheet(@CurrentUser() user: AuthenticatedUser, @Query() query: TimesheetQueryDto) {
    return this.timesheets.monthly(user, query);
  }

  @Post("timesheets/:month/lock")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(PERIOD_LOCK_PERMISSION)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Lock a month (AT-17): no more manual changes or schedule edits, recalculations skip it." })
  async lockPeriod(@CurrentUser() user: AuthenticatedUser, @Param("month") month: string, @Body() body: LockPeriodDto) {
    await this.confirmations.assertConfirmedForLock(month);
    return this.periods.lock(user, month, body?.note);
  }

  @Post("timesheets/:month/confirmation")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...CONFIRMATION_MANAGE_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Open or close employee confirmation for a month (AT-24)." })
  setConfirmationWindow(@CurrentUser() user: AuthenticatedUser, @Param("month") month: string, @Body() body: ConfirmationWindowDto) {
    return this.confirmations.setOpen(user, month, body.open);
  }

  @Post("timesheets/:month/confirmations/:employeeId/resolve")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...CONFIRMATION_MANAGE_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Record how an employee's feedback on their month was handled." })
  resolveFeedback(@CurrentUser() user: AuthenticatedUser, @Param("month") month: string, @Param("employeeId") employeeId: string, @Body() body: ResolveFeedbackDto) {
    return this.confirmations.resolve(user, month, employeeId, body.resolution);
  }

  @Get("me/timesheet")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "My month (AT-24): totals, whether confirmation is open, and my answer." })
  myTimesheet(@CurrentUser() user: AuthenticatedUser, @Query() query: MyTimesheetQueryDto) {
    return this.confirmations.myMonth(user, query.month);
  }

  @Post("me/timesheet/:month/confirm")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Confirm my month, or send feedback to HR, while confirmation is open." })
  confirmMyTimesheet(@CurrentUser() user: AuthenticatedUser, @Param("month") month: string, @Body() body: ConfirmTimesheetDto) {
    return this.confirmations.answer(user, month, body.action, body.feedback);
  }

  @Post("timesheets/:month/unlock")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(PERIOD_LOCK_PERMISSION)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Reopen a locked month; a reason is required and the action is audited." })
  unlockPeriod(@CurrentUser() user: AuthenticatedUser, @Param("month") month: string, @Body() body: UnlockPeriodDto) {
    return this.periods.unlock(user, month, body.reason);
  }

  @Get("raw-logs")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...RAW_LOG_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Raw punches (AT-21) of people in scope, filtered by range, person, device or name; paginated." })
  rawLogs(@CurrentUser() user: AuthenticatedUser, @Query() query: RawLogQueryDto) {
    return this.logs.rawLogs(user, query);
  }

  @Get("sync-errors")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...SYNC_ERROR_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Punches the sync refused (AT-20), open ones by default." })
  syncErrors(@Query() query: SyncErrorQueryDto) {
    return this.logs.syncErrors(query);
  }

  @Get("sync-errors/candidates")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...SYNC_ERROR_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Up to 20 people in scope to give an unknown attendance code to, searched by name or code." })
  syncErrorCandidates(@CurrentUser() user: AuthenticatedUser, @Query("q") q?: string) {
    return this.logs.candidates(user, q);
  }

  @Post("sync-errors/:id/resolve")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...SYNC_ERROR_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Give the unknown code to an employee (its refused punches become raw logs and days are recalculated), or dismiss the error." })
  resolveSyncError(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: ResolveSyncErrorDto) {
    return this.logs.resolve(user, id, body);
  }

  @Get("summary")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission("permission.attendance.view", "permission.attendance.manage", "hr.dashboard.attendance.view")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "This month's attendance figures for people in scope, and machine synchronization counts." })
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.getSummary(user);
  }

  @Post("recalculate")
  @HttpCode(202)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...RECALC_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Recalculate attendance for a date range (AT-12), for people in scope; returns the job to follow." })
  async recalculate(@CurrentUser() user: AuthenticatedUser, @Body() body: RecalculateAttendanceDto) {
    if (body.to < body.from) throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu.");
    if ((Date.parse(body.to) - Date.parse(body.from)) / 86_400_000 + 1 > MAX_RECALC_DAYS) {
      throw new BadRequestException(`Tính lại tối đa ${MAX_RECALC_DAYS} ngày một lần.`);
    }

    const scope = await this.dataScope.resolve(user, RECALC_PERMISSIONS);
    const filtered = Boolean(body.departmentIds?.length || body.employeeIds?.length);
    // Everyone (no list stored) only when the caller sees the whole company and picked nobody.
    let employeeIds: string[] | undefined;
    if (filtered || scope.level !== "company") {
      const people = await this.prisma.employee.findMany({
        where: {
          AND: [
            this.dataScope.employeeWhere(scope),
            filtered ? { OR: [{ id: { in: body.employeeIds ?? [] } }, { departmentId: { in: body.departmentIds ?? [] } }] } : {}
          ]
        },
        select: { id: true }
      });
      employeeIds = people.map((person) => person.id);
      if (employeeIds.length === 0) throw new BadRequestException("Không có nhân sự nào trong phạm vi của bạn để tính lại.");
    }

    const job = await this.recalc.request({ from: body.from, to: body.to, employeeIds, reason: "manual", requestedById: user.account?.employeeId ?? undefined });
    if (!job) throw new BadRequestException("Khoảng ngày chỉ gồm ngày chưa tới, không có gì để tính lại.");
    return job;
  }

  @Get("recalculations")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...RECALC_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Recent recalculation jobs, newest first." })
  recentRecalculations(@Query("limit") limit?: string) {
    return this.recalc.recent(limit ? Number(limit) || 20 : 20);
  }

  @Get("recalculations/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...RECALC_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "One recalculation job and its result." })
  recalculation(@Param("id") id: string) {
    return this.recalc.find(id);
  }

  @Post("sync")
  // Called by the attendance machine app, which authenticates with ATTENDANCE_SYNC_TOKEN instead of a user session.
  @Public()
  // Frequent machine batches; every punch is already kept in AttendanceRawLog.
  @SkipAudit()
  @UseGuards(AttendanceSyncGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Accept a retry-safe batch of raw punches from the Windows attendance sync app." })
  @ApiUnauthorizedResponse({ description: "The attendance integration token is missing or invalid." })
  sync(@Body() body: AttendanceSyncDto) {
    return this.attendanceService.syncFromDevice(body);
  }

  // AT-15: declared last so /me, /summary and /recalculations are not taken as an id.
  @Get(":id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...ATTENDANCE_VIEW_PERMISSIONS, ...RECALC_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "One calculated day with its raw punches and the history of manual changes." })
  detail(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.adjustments.detail(user, id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...ATTENDANCE_EDIT_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "HR changes a day by hand (AT-15); a reason is required and the change survives recalculation." })
  adjust(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: AdjustAttendanceDto) {
    return this.adjustments.adjust(user, id, body);
  }

  @Delete(":id/adjustment")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission(...ATTENDANCE_EDIT_PERMISSIONS)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Undo manual changes: the day goes back to the calculated result." })
  revokeAdjustment(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: RevokeAdjustmentDto) {
    return this.adjustments.revoke(user, id, body ?? {});
  }
}
