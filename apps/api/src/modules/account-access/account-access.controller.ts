import { Controller, Get, Param } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
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

  @Get("accounts/:id")
  @ApiOkResponse({ description: "Single user account with resolved group and effective permissions." })
  findOne(@Param("id") id: string) {
    return this.accountAccessService.findOne(id);
  }

  @Get("groups")
  @ApiOkResponse({ description: "Permission groups and their assigned permissions." })
  findGroups() {
    return this.accountAccessService.findGroups();
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
