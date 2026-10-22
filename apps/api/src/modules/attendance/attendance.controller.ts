import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
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
import { AttendanceService } from "./attendance.service";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RecalculateAttendanceDto } from "./attendance-recalc.dto";
import { AttendanceRecalcService } from "./attendance-recalc.service";

const ATTENDANCE_MANAGE = "permission.attendance.manage";
const RECALC_PERMISSIONS = [ATTENDANCE_MANAGE, "permission.attendance-timesheets.manage"];
const MAX_RECALC_DAYS = 366;

@ApiTags("attendance")
@Controller("attendance")
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly recalc: AttendanceRecalcService,
    private readonly dataScope: DataScopeService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission("permission.attendance.view", "permission.attendance.manage")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Attendance records from machine imports and PWA check-ins." })
  findRecords() {
    return this.attendanceService.findRecords();
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Attendance records for the employee linked to the current account." })
  findMyRecords(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.findEmployeeRecords(user.account?.employeeId);
  }

  @Get("summary")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequireAnyPermission("permission.attendance.view", "permission.attendance.manage", "hr.dashboard.attendance.view")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Attendance quality and machine synchronization summary." })
  getSummary() {
    return this.attendanceService.getSummary();
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
}
