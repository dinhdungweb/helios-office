import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission } from "../auth/permissions.decorator";
import { LeaveRequestsService } from "./leave-requests.service";

@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission("permission.requests.view", "permission.requests.manage", "hr.dashboard.requests.view")
@ApiTags("leave-requests")
@ApiBearerAuth()
@Controller("leave-requests")
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Get()
  @ApiOkResponse({ description: "Leave, OT, and business-trip requests." })
  findAll() {
    return this.leaveRequestsService.findAll();
  }
}
