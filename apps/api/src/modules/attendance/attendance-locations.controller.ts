import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { DEVICE_MANAGE_PERMISSION } from "./attendance-devices.service";
import { AttendanceLocationDto } from "./attendance-locations.dto";
import { AttendanceLocationsService } from "./attendance-locations.service";

@ApiTags("attendance")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions(DEVICE_MANAGE_PERMISSION)
@ApiBearerAuth()
@Controller("attendance-locations")
export class AttendanceLocationsController {
  constructor(private readonly locations: AttendanceLocationsService) {}

  @Get()
  @ApiOkResponse({ description: "Valid check-in places (DV-07): GPS points, wifi networks and office IP ranges." })
  findAll() {
    return this.locations.findAll();
  }

  @Post()
  @ApiOkResponse({ description: "Add a place; only the fields of its kind are kept." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: AttendanceLocationDto) {
    return this.locations.create(body, user.account?.employeeId ?? undefined);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Replace a place, or turn it on/off." })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: AttendanceLocationDto) {
    return this.locations.update(id, body, user.account?.employeeId ?? undefined);
  }

  @Delete(":id")
  @ApiOkResponse({ description: "Remove a place." })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.locations.remove(id, user.account?.employeeId ?? undefined);
  }
}
