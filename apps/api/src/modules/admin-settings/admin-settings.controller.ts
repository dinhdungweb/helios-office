import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import {
  TestSmtpSettingsDto,
  UpdateCompanyInfoDto,
  UpdateIntranetSettingsDto,
  UpdateModuleConfigDto,
  UpdateSmtpSettingsDto
} from "./admin-settings.dto";
import { AdminSettingsService } from "./admin-settings.service";

@ApiTags("admin-settings")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions("system.accounts.manage")
@ApiBearerAuth()
@Controller("admin-settings")
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get()
  @ApiOkResponse({ description: "Complete admin settings center grouped by system, module, and operations." })
  findAll() {
    return this.adminSettingsService.findAll();
  }

  @Get("overview")
  @ApiOkResponse({ description: "Admin settings status summary." })
  findOverview() {
    return this.adminSettingsService.findOverview();
  }

  @Get("system")
  @ApiOkResponse({ description: "System-wide settings such as org chart, security, roles, branding, and SMTP." })
  findSystemSettings() {
    return this.adminSettingsService.findSystemSettings();
  }

  @Get("modules")
  @ApiOkResponse({ description: "Module settings for HRM, WORK, and CRM." })
  findModuleSettings() {
    return this.adminSettingsService.findModuleSettings();
  }

  @Get("operations")
  @ApiOkResponse({ description: "Admin operations settings for reconciliation, logs, import/export, and Open API." })
  findOperationSettings() {
    return this.adminSettingsService.findOperationSettings();
  }

  @Get("events")
  @ApiOkResponse({ description: "Recent admin operation events." })
  findEvents() {
    return this.adminSettingsService.findEvents();
  }

  @Get("company-info")
  @ApiOkResponse({ description: "Company identity, contact, legal, bank, and asset settings." })
  getCompanyInfo() {
    return this.adminSettingsService.getCompanyInfo();
  }

  @Patch("company-info")
  @ApiOkResponse({ description: "Update company identity and contact settings." })
  updateCompanyInfo(@Body() body: UpdateCompanyInfoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.adminSettingsService.updateCompanyInfo(body, user.account?.employeeId ?? undefined);
  }

  @Get("intranet")
  @ApiOkResponse({ description: "Intranet branding, social, privacy, and communication settings." })
  getIntranetSettings() {
    return this.adminSettingsService.getIntranetSettings();
  }

  @Patch("intranet")
  @ApiOkResponse({ description: "Update intranet settings." })
  updateIntranetSettings(@Body() body: UpdateIntranetSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.adminSettingsService.updateIntranetSettings(body, user.account?.employeeId ?? undefined);
  }

  @Get("module-config")
  @ApiOkResponse({ description: "Business module enablement configuration." })
  getModuleConfig() {
    return this.adminSettingsService.getModuleConfig();
  }

  @Patch("module-config")
  @ApiOkResponse({ description: "Update module enablement configuration." })
  updateModuleConfig(@Body() body: UpdateModuleConfigDto, @CurrentUser() user: AuthenticatedUser) {
    return this.adminSettingsService.updateModuleConfig(body, user.account?.employeeId ?? undefined);
  }

  @Get("smtp")
  @ApiOkResponse({ description: "SMTP settings persisted in AdminSetting." })
  getSmtpSettings() {
    return this.adminSettingsService.getSmtpSettings();
  }

  @Patch("smtp")
  @ApiOkResponse({ description: "Update SMTP settings and sync them to Keycloak when enabled." })
  updateSmtpSettings(@Body() body: UpdateSmtpSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.adminSettingsService.updateSmtpSettings(body, user.account?.employeeId ?? undefined);
  }

  @Post("smtp/test")
  @ApiOkResponse({ description: "Send a real SMTP test email." })
  testSmtpSettings(@Body() body: TestSmtpSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.adminSettingsService.testSmtpSettings(body, user.account?.employeeId ?? undefined);
  }

  @Get(":id")
  @ApiOkResponse({ description: "Single admin setting item." })
  findOne(@Param("id") id: string) {
    return this.adminSettingsService.findOne(id);
  }
}
