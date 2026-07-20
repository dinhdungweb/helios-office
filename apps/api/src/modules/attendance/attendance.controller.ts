import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AttendanceSyncDto } from "./attendance-sync.dto";
import { AttendanceSyncGuard } from "./attendance-sync.guard";
import { AttendanceService } from "./attendance.service";

@ApiTags("attendance")
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

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

  @Post("sync")
  @UseGuards(AttendanceSyncGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Accept a retry-safe batch of raw punches from the Windows attendance sync app." })
  @ApiUnauthorizedResponse({ description: "The attendance integration token is missing or invalid." })
  sync(@Body() body: AttendanceSyncDto) {
    return this.attendanceService.syncFromDevice(body);
  }
}
