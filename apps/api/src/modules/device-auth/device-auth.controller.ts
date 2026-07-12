import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { UpdateDeviceAuthPolicyDto, UpdateDeviceAuthStatusDto } from "./device-auth.dto";
import { DeviceAuthService } from "./device-auth.service";

@ApiTags("device-auth")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions("attendance.device.manage")
@ApiBearerAuth()
@Controller("device-auth")
export class DeviceAuthController {
  constructor(private readonly deviceAuthService: DeviceAuthService) {}

  @Get("requests")
  @ApiOkResponse({ description: "Device authentication requests for attendance app access." })
  findRequests() {
    return this.deviceAuthService.findRequests();
  }

  @Patch("requests/:id/status")
  @ApiOkResponse({ description: "Approve, reject, or lock a device authentication request." })
  updateStatus(@Param("id") id: string, @Body() body: UpdateDeviceAuthStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.deviceAuthService.updateStatus(id, body, user.account?.employeeId ?? undefined);
  }

  @Delete("requests/:id")
  @ApiOkResponse({ description: "Delete a device authentication request." })
  deleteRequest(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.deviceAuthService.deleteRequest(id, user.account?.employeeId ?? undefined);
  }

  @Get("policy")
  @ApiOkResponse({ description: "Device authentication policy for the attendance app." })
  findPolicy() {
    return this.deviceAuthService.findPolicy();
  }

  @Patch("policy")
  @ApiOkResponse({ description: "Update device authentication policy." })
  updatePolicy(@Body() body: UpdateDeviceAuthPolicyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.deviceAuthService.updatePolicy(body, user.account?.employeeId ?? undefined);
  }
}
