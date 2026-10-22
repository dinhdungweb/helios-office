import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission, RequirePermissions } from "../auth/permissions.decorator";
import { CreateShiftDto, UpdateShiftDto } from "./shifts.dto";
import { ShiftsService } from "./shifts.service";

// Reading the catalogue needs any attendance permission; changing it needs timesheet management.
export const ATTENDANCE_READ_PERMISSIONS = [
  "permission.attendance.view",
  "permission.attendance.manage",
  "permission.attendance-timesheets.view",
  "permission.attendance-timesheets.manage"
];
export const ATTENDANCE_SETUP_PERMISSION = "permission.attendance-timesheets.manage";

@ApiTags("attendance")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission(...ATTENDANCE_READ_PERMISSIONS)
@ApiBearerAuth()
@Controller("shifts")
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get()
  @ApiOkResponse({ description: "Shift catalogue (AT-05); ?includeArchived=true for archived ones too." })
  findAll(@Query("includeArchived") includeArchived?: string) {
    return this.shifts.findAll(includeArchived === "true");
  }

  @Post()
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Create a shift." })
  create(@Body() body: CreateShiftDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shifts.create(body, user.account?.employeeId ?? undefined);
  }

  @Patch(":id")
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Update a shift." })
  update(@Param("id") id: string, @Body() body: UpdateShiftDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shifts.update(id, body, user.account?.employeeId ?? undefined);
  }

  @Post(":id/archive")
  @HttpCode(200)
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Archive a shift that is not a company or department default." })
  archive(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shifts.archive(id, user.account?.employeeId ?? undefined);
  }

  @Post(":id/restore")
  @HttpCode(200)
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Restore an archived shift." })
  restore(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shifts.restore(id, user.account?.employeeId ?? undefined);
  }

  @Delete(":id")
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Delete a shift nothing uses; used shifts are archived instead." })
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shifts.remove(id, user.account?.employeeId ?? undefined);
  }
}
