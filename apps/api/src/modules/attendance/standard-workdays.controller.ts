import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission, RequirePermissions } from "../auth/permissions.decorator";
import { ATTENDANCE_READ_PERMISSIONS, ATTENDANCE_SETUP_PERMISSION } from "../shifts/shifts.controller";
import { StandardWorkdayRuleDto } from "./standard-workdays.dto";
import { StandardWorkdayService } from "./standard-workdays.service";

@ApiTags("attendance")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission(...ATTENDANCE_READ_PERMISSIONS)
@ApiBearerAuth()
@Controller("standard-workday-rules")
export class StandardWorkdayController {
  constructor(private readonly standards: StandardWorkdayService) {}

  @Get()
  @ApiOkResponse({ description: "Standard work unit rules per group of departments × positions (AT-25)." })
  findAll() {
    return this.standards.findAll();
  }

  @Post()
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Add a rule; refused when it would change a locked month or clash with a rule for the same group and month." })
  create(@Body() body: StandardWorkdayRuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.standards.create(body, user.account?.employeeId ?? undefined);
  }

  @Patch(":id")
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Replace a rule." })
  update(@Param("id") id: string, @Body() body: StandardWorkdayRuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.standards.update(id, body, user.account?.employeeId ?? undefined);
  }

  @Delete(":id")
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Remove a rule that no locked month depends on." })
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.standards.remove(id, user.account?.employeeId ?? undefined);
  }
}
