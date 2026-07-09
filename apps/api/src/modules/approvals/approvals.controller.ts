import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { ApprovalDecision, ApprovalsService } from "./approvals.service";

class DecideApprovalDto {
  @IsIn(["approved", "rejected"])
  decision!: ApprovalDecision;
}

@ApiTags("approvals")
@Controller("approvals")
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @ApiOkResponse({ description: "Pending approval tasks across HRM workflows." })
  findPending() {
    return this.approvalsService.findPending();
  }

  @Post(":id/decision")
  @ApiOkResponse({ description: "Approve or reject a workflow request." })
  decide(@Param("id") id: string, @Body() dto: DecideApprovalDto) {
    return this.approvalsService.decide(id, dto.decision);
  }
}
