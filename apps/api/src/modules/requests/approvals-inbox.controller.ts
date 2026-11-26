import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DecisionDto, RequestListQueryDto, ReturnDto } from "./requests.dto";
import { RequestsService } from "./requests.service";

// The approver's side (AP-14 → AP-16, AP-19). Being an assignee of the step is the permission,
// checked in the engine.
@ApiTags("approvals")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("approvals")
export class ApprovalsInboxController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  @ApiOkResponse({ description: "Requests waiting for my decision, delegations included (AP-14)." })
  inbox(@CurrentUser() user: AuthenticatedUser, @Query() query: RequestListQueryDto) {
    return this.requests.list(user, { ...query, box: "to_approve" });
  }

  @Post(":id/decision")
  @ApiOkResponse({ description: "Approve or reject the step :id (AP-15)." })
  decide(@CurrentUser() user: AuthenticatedUser, @Param("id") stepId: string, @Body() dto: DecisionDto) {
    return this.requests.decide(user, stepId, dto.action, dto.reason, dto.version);
  }

  @Post(":id/return")
  @ApiOkResponse({ description: "Return the request of step :id to the requester for changes (AP-16)." })
  returnToRequester(@CurrentUser() user: AuthenticatedUser, @Param("id") stepId: string, @Body() dto: ReturnDto) {
    return this.requests.decide(user, stepId, "return", dto.reason, dto.version);
  }

  @Get(":id/timeline")
  @ApiOkResponse({ description: "Steps, actions and comments of request :id in order (AP-19)." })
  timeline(@CurrentUser() user: AuthenticatedUser, @Param("id") requestId: string) {
    return this.requests.timeline(user, requestId);
  }
}
