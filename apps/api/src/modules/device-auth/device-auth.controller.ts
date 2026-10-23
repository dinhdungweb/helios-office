import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { SubmitMyDeviceDto, UpdateDeviceAuthPolicyDto, UpdateDeviceAuthStatusDto } from "./device-auth.dto";
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

// DV-05: every signed-in employee registers and sees their own devices; HR approves them above.
@ApiTags("device-auth")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("device-auth")
export class MyDeviceAuthController {
  constructor(private readonly deviceAuthService: DeviceAuthService) {}

  @Get("my-devices")
  @ApiOkResponse({ description: "My devices and their approval status; ?deviceId marks the one in use." })
  myDevices(@CurrentUser() user: AuthenticatedUser, @Query("deviceId") deviceId?: string) {
    return this.deviceAuthService.myDevices(user, deviceId);
  }

  @Post("my-requests")
  @ApiOkResponse({ description: "Ask HR to approve this browser or phone for check-in." })
  submit(@CurrentUser() user: AuthenticatedUser, @Body() body: SubmitMyDeviceDto) {
    return this.deviceAuthService.submitMine(user, body);
  }

  @Delete("my-requests/:id")
  @ApiOkResponse({ description: "Withdraw my request that is still pending or was rejected." })
  withdraw(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.deviceAuthService.withdrawMine(user, id);
  }
}
