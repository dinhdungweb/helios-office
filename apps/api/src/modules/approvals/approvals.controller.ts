import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission, RequirePermissions } from "../auth/permissions.decorator";
import { ApprovalDecision, ApprovalsService } from "./approvals.service";

class DecideApprovalDto {
  @IsIn(["approved", "rejected"])
  decision!: ApprovalDecision;
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission("permission.approvals.view", "permission.approvals.manage")
@ApiTags("approvals")
@ApiBearerAuth()
@Controller("approvals")
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @ApiOkResponse({ description: "Pending approval tasks across HRM workflows." })
  findPending() {
    return this.approvalsService.findPending();
  }

  @Post(":id/decision")
  @RequirePermissions("permission.approvals.manage")
  @ApiOkResponse({ description: "Approve or reject a workflow request." })
  decide(@Param("id") id: string, @Body() dto: DecideApprovalDto) {
    return this.approvalsService.decide(id, dto.decision);
  }
}
