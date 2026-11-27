import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { CreateAttendanceDeviceDto, UpdateAttendanceDeviceDto } from "./attendance-devices.dto";
import { AttendanceDevicesService, DEVICE_MANAGE_PERMISSION } from "./attendance-devices.service";

@ApiTags("attendance")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions(DEVICE_MANAGE_PERMISSION)
@ApiBearerAuth()
@Controller("attendance-devices")
export class AttendanceDevicesController {
  constructor(private readonly devices: AttendanceDevicesService) {}

  @Get()
  @ApiOkResponse({ description: "Attendance machines (AT-19) with their last sync, log and error counts." })
  findAll() {
    return this.devices.findAll();
  }

  @Post()
  @ApiOkResponse({ description: "Register a machine ahead of its first sync." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateAttendanceDeviceDto) {
    return this.devices.create(body, user.account?.employeeId ?? undefined);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Rename, move or turn a machine on/off; an inactive machine's syncs are refused." })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: UpdateAttendanceDeviceDto) {
    if (body.deviceId !== undefined) throw new BadRequestException("Không đổi được mã máy; tạo máy mới nếu cần.");
    return this.devices.update(id, body, user.account?.employeeId ?? undefined);
  }

  @Delete(":id")
  @ApiOkResponse({ description: "Delete a machine that never sent a log." })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.devices.remove(id, user.account?.employeeId ?? undefined);
  }
}
