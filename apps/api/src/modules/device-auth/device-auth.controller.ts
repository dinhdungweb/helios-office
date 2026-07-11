import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdateDeviceAuthPolicyDto, UpdateDeviceAuthStatusDto } from "./device-auth.dto";
import { DeviceAuthService } from "./device-auth.service";

@ApiTags("device-auth")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
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
  updateStatus(@Param("id") id: string, @Body() body: UpdateDeviceAuthStatusDto) {
    return this.deviceAuthService.updateStatus(id, body);
  }

  @Delete("requests/:id")
  @ApiOkResponse({ description: "Delete a device authentication request." })
  deleteRequest(@Param("id") id: string) {
    return this.deviceAuthService.deleteRequest(id);
  }

  @Get("policy")
  @ApiOkResponse({ description: "Device authentication policy for the attendance app." })
  findPolicy() {
    return this.deviceAuthService.findPolicy();
  }

  @Patch("policy")
  @ApiOkResponse({ description: "Update device authentication policy." })
  updatePolicy(@Body() body: UpdateDeviceAuthPolicyDto) {
    return this.deviceAuthService.updatePolicy(body);
  }
}
