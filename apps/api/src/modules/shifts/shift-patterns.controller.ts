import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission, RequirePermissions } from "../auth/permissions.decorator";
import { CreateShiftPatternDto, UpdateShiftPatternDto } from "./shift-patterns.dto";
import { ShiftPatternsService } from "./shift-patterns.service";
import { ATTENDANCE_READ_PERMISSIONS, ATTENDANCE_SETUP_PERMISSION } from "./shifts.controller";

@ApiTags("attendance")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission(...ATTENDANCE_READ_PERMISSIONS)
@ApiBearerAuth()
@Controller("shift-patterns")
export class ShiftPatternsController {
  constructor(private readonly patterns: ShiftPatternsService) {}

  @Get()
  @ApiOkResponse({ description: "Repeating shift patterns for bulk scheduling (AT-08)." })
  findAll() {
    return this.patterns.findAll();
  }

  @Post()
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Create a pattern." })
  create(@Body() body: CreateShiftPatternDto, @CurrentUser() user: AuthenticatedUser) {
    return this.patterns.create(body, user.account?.employeeId ?? undefined);
  }

  @Patch(":id")
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Update a pattern; schedules already applied are not changed." })
  update(@Param("id") id: string, @Body() body: UpdateShiftPatternDto, @CurrentUser() user: AuthenticatedUser) {
    return this.patterns.update(id, body, user.account?.employeeId ?? undefined);
  }

  @Delete(":id")
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Delete a pattern." })
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.patterns.remove(id, user.account?.employeeId ?? undefined);
  }
}
