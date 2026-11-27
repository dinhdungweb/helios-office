import { Body, Controller, Param, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { DepartmentDefaultShiftDto } from "./shift-assignments.dto";
import { ShiftAssignmentsService } from "./shift-assignments.service";
import { ATTENDANCE_SETUP_PERMISSION } from "./shifts.controller";

@ApiTags("attendance")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
@ApiBearerAuth()
@Controller("departments")
export class DepartmentShiftController {
  constructor(private readonly assignments: ShiftAssignmentsService) {}

  @Put(":id/default-shift")
  @ApiOkResponse({ description: "Set (or clear with null) the shift a department works when nobody is scheduled (AT-07)." })
  setDefault(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: DepartmentDefaultShiftDto) {
    return this.assignments.setDepartmentDefault(user, id, body.shiftId);
  }
}
