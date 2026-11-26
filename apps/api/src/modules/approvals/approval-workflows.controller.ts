import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission } from "../auth/permissions.decorator";
import { CreateApprovalWorkflowDto, UpdateApprovalWorkflowDto } from "./approval-workflows.dto";
import { ApprovalWorkflowsService } from "./approval-workflows.service";

@ApiTags("approval-workflows")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission("permission.approvals.manage", "employees.department.manage", "system.accounts.manage")
@ApiBearerAuth()
@Controller("approval-workflows")
export class ApprovalWorkflowsController {
  constructor(private readonly workflows: ApprovalWorkflowsService) {}

  @Get()
  @ApiOkResponse({ description: "Approval workflow definitions." })
  findAll(@Query("includeArchived") includeArchived?: string) {
    return this.workflows.findAll(includeArchived === "true");
  }

  @Get(":id")
  @ApiOkResponse({ description: "One workflow with the problems that stop it from being activated (AP-05)." })
  findOne(@Param("id") id: string) {
    return this.workflows.findOne(id);
  }

  @Get(":id/versions")
  @ApiOkResponse({ description: "Frozen versions of a workflow and how many requests use each (AP-06)." })
  versions(@Param("id") id: string) {
    return this.workflows.versions(id);
  }

  @Post()
  @ApiOkResponse({ description: "Create an approval workflow definition." })
  create(@Body() body: CreateApprovalWorkflowDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workflows.create(body, user.account?.employeeId ?? undefined);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Edit a workflow; diagram or settings changes make a new version (AP-04)." })
  update(@Param("id") id: string, @Body() body: UpdateApprovalWorkflowDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workflows.update(id, body, user.account?.employeeId ?? undefined);
  }

  @Post(":id/duplicate")
  @ApiOkResponse({ description: "Copy a workflow as an inactive draft (AP-07)." })
  duplicate(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflows.duplicate(id, user.account?.employeeId ?? undefined);
  }

  @Post(":id/activate")
  @ApiOkResponse({ description: "Activate a workflow whose diagram is valid (AP-08)." })
  activate(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflows.activate(id, user.account?.employeeId ?? undefined);
  }

  @Post(":id/deactivate")
  @ApiOkResponse({ description: "Stop using a workflow for new requests (AP-08)." })
  deactivate(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflows.deactivate(id, user.account?.employeeId ?? undefined);
  }

  @Delete(":id")
  @ApiOkResponse({ description: "Delete a workflow no request has used." })
  delete(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflows.delete(id, user.account?.employeeId ?? undefined);
  }
}
