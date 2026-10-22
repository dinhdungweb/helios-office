import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission, RequirePermissions } from "../auth/permissions.decorator";
import { AssignShiftsDto, ClearAssignmentsDto, ScheduleQueryDto } from "./shift-assignments.dto";
import { ShiftAssignmentsService } from "./shift-assignments.service";
import { ATTENDANCE_READ_PERMISSIONS, ATTENDANCE_SETUP_PERMISSION } from "./shifts.controller";

@ApiTags("attendance")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission(...ATTENDANCE_READ_PERMISSIONS)
@ApiBearerAuth()
@Controller("shift-assignments")
export class ShiftAssignmentsController {
  constructor(private readonly assignments: ShiftAssignmentsService) {}

  @Get()
  @ApiOkResponse({ description: "Schedule grid (AT-07): people in scope × dates, with each day's shift and where it comes from." })
  schedule(@CurrentUser() user: AuthenticatedUser, @Query() query: ScheduleQueryDto) {
    return this.assignments.schedule(user, query);
  }

  @Post()
  @HttpCode(200)
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Assign a shift (or a day off) to people on dates; replaces what was there." })
  assign(@CurrentUser() user: AuthenticatedUser, @Body() body: AssignShiftsDto) {
    return this.assignments.assign(user, body);
  }

  @Post("clear")
  @HttpCode(200)
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Remove assignments so those dates fall back to the department/company default." })
  clear(@CurrentUser() user: AuthenticatedUser, @Body() body: ClearAssignmentsDto) {
    return this.assignments.clear(user, body);
  }

  @Delete(":id")
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Remove one assignment." })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.assignments.remove(user, id);
  }
}
