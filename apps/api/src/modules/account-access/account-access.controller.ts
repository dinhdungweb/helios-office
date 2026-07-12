import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import {
  CreatePermissionDefinitionDto,
  CreatePermissionGroupDto,
  CreateUserAccountDto,
  UpdatePermissionDefinitionDto,
  UpdatePermissionGroupDto,
  UpdateUserAccountDto
} from "./account-access.dto";
import { AccountAccessService } from "./account-access.service";

@ApiTags("account-access")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions("system.accounts.manage")
@ApiBearerAuth()
@Controller("account-access")
export class AccountAccessController {
  constructor(private readonly accountAccessService: AccountAccessService) {}

  @Get("summary")
  @ApiOkResponse({ description: "Account role, lifecycle status, and custom permission summary." })
  getSummary() {
    return this.accountAccessService.findSummary();
  }

  @Get("accounts")
  @ApiOkResponse({ description: "User accounts with role, group, status, and effective permissions." })
  findAccounts() {
    return this.accountAccessService.findAccounts();
  }

  @Post("accounts")
  @ApiOkResponse({ description: "Create a user account and optionally bind it to an employee." })
  createAccount(@Body() body: CreateUserAccountDto, @CurrentUser() user: AuthenticatedUser) {
    return this.accountAccessService.createAccount(body, user.account?.employeeId ?? undefined);
  }

  @Get("accounts/:id")
  @ApiOkResponse({ description: "Single user account with resolved group and effective permissions." })
  findOne(@Param("id") id: string) {
    return this.accountAccessService.findOne(id);
  }

  @Patch("accounts/:id")
  @ApiOkResponse({ description: "Update user account role, group, status, and custom permissions." })
  updateAccount(@Param("id") id: string, @Body() body: UpdateUserAccountDto, @CurrentUser() user: AuthenticatedUser) {
    return this.accountAccessService.updateAccount(id, body, user.account?.employeeId ?? undefined);
  }

  @Post("accounts/:id/activate")
  @ApiOkResponse({ description: "Activate a pending user account." })
  activateAccount(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.accountAccessService.activateAccount(id, user.account?.employeeId ?? undefined);
  }

  @Post("accounts/:id/close")
  @ApiOkResponse({ description: "Close a user account so it can no longer sign in." })
  closeAccount(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.accountAccessService.closeAccount(id, user.account?.employeeId ?? undefined);
  }

  @Post("accounts/:id/resend-invite")
  @ApiOkResponse({ description: "Send a reset-password invite email for an active account." })
  resendInvite(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.accountAccessService.resendInvite(id, user.account?.employeeId ?? undefined);
  }

  @Get("groups")
  @ApiOkResponse({ description: "Permission groups and their assigned permissions." })
  findGroups() {
    return this.accountAccessService.findGroups();
  }

  @Post("groups")
  @ApiOkResponse({ description: "Create a permission group." })
  createGroup(@Body() body: CreatePermissionGroupDto, @CurrentUser() user: AuthenticatedUser) {
    return this.accountAccessService.createGroup(body, user.account?.employeeId ?? undefined);
  }

  @Patch("groups/:id")
  @ApiOkResponse({ description: "Update a permission group and its permission keys." })
  updateGroup(@Param("id") id: string, @Body() body: UpdatePermissionGroupDto, @CurrentUser() user: AuthenticatedUser) {
    return this.accountAccessService.updateGroup(id, body, user.account?.employeeId ?? undefined);
  }

  @Post("groups/:id/archive")
  @ApiOkResponse({ description: "Archive an unused custom permission group without deleting audit history." })
  archiveGroup(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.accountAccessService.archiveGroup(id, user.account?.employeeId ?? undefined);
  }

  @Post("groups/:id/restore")
  @ApiOkResponse({ description: "Restore an archived permission group so it can be assigned again." })
  restoreGroup(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.accountAccessService.restoreGroup(id, user.account?.employeeId ?? undefined);
  }

  @Get("permissions")
  @ApiOkResponse({ description: "Permission catalog used by roles and custom overrides." })
  findPermissions() {
    return this.accountAccessService.findPermissions();
  }

  @Post("permissions")
  @ApiOkResponse({ description: "Create a permission definition in the catalog." })
  createPermission(@Body() body: CreatePermissionDefinitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.accountAccessService.createPermissionDefinition(body, user.account?.employeeId ?? undefined);
  }

  @Patch("permissions/:key")
  @ApiOkResponse({ description: "Update a permission definition label, category, scope, or ordering." })
  updatePermission(
    @Param("key") key: string,
    @Body() body: UpdatePermissionDefinitionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.accountAccessService.updatePermissionDefinition(key, body, user.account?.employeeId ?? undefined);
  }

  @Delete("permissions/:key")
  @ApiOkResponse({ description: "Delete an unused permission definition from the catalog." })
  deletePermission(@Param("key") key: string, @CurrentUser() user: AuthenticatedUser) {
    return this.accountAccessService.deletePermissionDefinition(key, user.account?.employeeId ?? undefined);
  }
}
