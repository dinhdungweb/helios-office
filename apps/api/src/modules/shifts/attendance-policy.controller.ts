import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission, RequirePermissions } from "../auth/permissions.decorator";
import { ATTENDANCE_READ_PERMISSIONS, ATTENDANCE_SETUP_PERMISSION } from "./shifts.controller";
import { UpdateAttendancePolicyDto } from "./shifts.dto";
import { ShiftsService } from "./shifts.service";

@ApiTags("attendance")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission(...ATTENDANCE_READ_PERMISSIONS)
@ApiBearerAuth()
@Controller("attendance-policy")
export class AttendancePolicyController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get()
  @ApiOkResponse({ description: "Company attendance policy (AT-06): grace periods, rounding, missing punches, overtime rates." })
  get() {
    return this.shifts.getPolicy();
  }

  @Patch()
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Update the attendance policy; fields left out keep their value." })
  update(@Body() body: UpdateAttendancePolicyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shifts.updatePolicy(body, user.account?.employeeId ?? undefined);
  }
}
