import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission } from "../auth/permissions.decorator";
import { CreateApprovalWorkflowDto } from "./approval-workflows.dto";
import { ApprovalWorkflowsService } from "./approval-workflows.service";

@ApiTags("approval-workflows")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission("employees.department.manage", "system.accounts.manage")
@ApiBearerAuth()
@Controller("approval-workflows")
export class ApprovalWorkflowsController {
  constructor(private readonly workflows: ApprovalWorkflowsService) {}

  @Get()
  @ApiOkResponse({ description: "Personnel approval workflow definitions." })
  findAll(@Query("includeArchived") includeArchived?: string) {
    return this.workflows.findAll(includeArchived === "true");
  }

  @Post()
  @ApiOkResponse({ description: "Create a personnel approval workflow definition." })
  create(@Body() body: CreateApprovalWorkflowDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workflows.create(body, user.account?.employeeId ?? undefined);
  }

  @Delete(":id")
  @ApiOkResponse({ description: "Delete a personnel approval workflow definition." })
  delete(@Param("id") id: string) {
    return this.workflows.delete(id);
  }
}
