import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { LEAVE_MANAGE_PERMISSION } from "./leave-balances.service";
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from "./leave.dto";
import { LeaveTypesService } from "./leave-types.service";

// Everyone reads the list (the leave form needs it); changing it needs permission.leave.manage.
@ApiTags("leave")
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller("leave-types")
export class LeaveTypesController {
  constructor(private readonly leaveTypes: LeaveTypesService) {}

  @Get()
  @ApiOkResponse({ description: "Leave types (LV-09)." })
  findAll(@Query("includeArchived") includeArchived?: string) {
    return this.leaveTypes.findAll(includeArchived === "true");
  }

  @Post()
  @RequirePermissions(LEAVE_MANAGE_PERMISSION)
  @ApiOkResponse({ description: "Add a leave type." })
  create(@Body() dto: CreateLeaveTypeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.leaveTypes.create(dto, user.account?.employeeId ?? undefined);
  }

  @Patch(":id")
  @RequirePermissions(LEAVE_MANAGE_PERMISSION)
  @ApiOkResponse({ description: "Edit or archive a leave type." })
  update(@Param("id") id: string, @Body() dto: UpdateLeaveTypeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.leaveTypes.update(id, dto, user.account?.employeeId ?? undefined);
  }

  @Delete(":id")
  @RequirePermissions(LEAVE_MANAGE_PERMISSION)
  @ApiOkResponse({ description: "Delete a leave type no request or balance uses." })
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leaveTypes.remove(id, user.account?.employeeId ?? undefined);
  }
}
