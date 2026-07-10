import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  CreatePermissionGroupDto,
  CreateUserAccountDto,
  UpdatePermissionGroupDto,
  UpdateUserAccountDto
} from "./account-access.dto";
import { AccountAccessService } from "./account-access.service";

@ApiTags("account-access")
@Controller("account-access")
export class AccountAccessController {
  constructor(private readonly accountAccessService: AccountAccessService) {}

  @Get("summary")
  @ApiOkResponse({ description: "Account role, license, status, and custom permission summary." })
  getSummary() {
    return this.accountAccessService.findSummary();
  }

  @Get("accounts")
  @ApiOkResponse({ description: "User accounts with role, license, group, status, and effective permissions." })
  findAccounts() {
    return this.accountAccessService.findAccounts();
  }

  @Post("accounts")
  @ApiOkResponse({ description: "Create a user account and optionally bind it to an employee." })
  createAccount(@Body() body: CreateUserAccountDto) {
    return this.accountAccessService.createAccount(body);
  }

  @Get("accounts/:id")
  @ApiOkResponse({ description: "Single user account with resolved group and effective permissions." })
  findOne(@Param("id") id: string) {
    return this.accountAccessService.findOne(id);
  }

  @Patch("accounts/:id")
  @ApiOkResponse({ description: "Update user account role, license, group, status, and custom permissions." })
  updateAccount(@Param("id") id: string, @Body() body: UpdateUserAccountDto) {
    return this.accountAccessService.updateAccount(id, body);
  }

  @Post("accounts/:id/activate")
  @ApiOkResponse({ description: "Activate a pending user account." })
  activateAccount(@Param("id") id: string) {
    return this.accountAccessService.activateAccount(id);
  }

  @Post("accounts/:id/close")
  @ApiOkResponse({ description: "Close a user account so it can no longer sign in or consume license." })
  closeAccount(@Param("id") id: string) {
    return this.accountAccessService.closeAccount(id);
  }

  @Get("groups")
  @ApiOkResponse({ description: "Permission groups and their assigned permissions." })
  findGroups() {
    return this.accountAccessService.findGroups();
  }

  @Post("groups")
  @ApiOkResponse({ description: "Create a permission group." })
  createGroup(@Body() body: CreatePermissionGroupDto) {
    return this.accountAccessService.createGroup(body);
  }

  @Patch("groups/:id")
  @ApiOkResponse({ description: "Update a permission group and its permission keys." })
  updateGroup(@Param("id") id: string, @Body() body: UpdatePermissionGroupDto) {
    return this.accountAccessService.updateGroup(id, body);
  }

  @Get("licenses")
  @ApiOkResponse({ description: "Available license plans." })
  findLicenses() {
    return this.accountAccessService.findLicenses();
  }

  @Get("permissions")
  @ApiOkResponse({ description: "Permission catalog used by roles and custom overrides." })
  findPermissions() {
    return this.accountAccessService.findPermissions();
  }
}
