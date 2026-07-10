import { Controller, Get, Param } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AdminSettingsService } from "./admin-settings.service";

@ApiTags("admin-settings")
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

  @Get(":id")
  @ApiOkResponse({ description: "Single admin setting item." })
  findOne(@Param("id") id: string) {
    return this.adminSettingsService.findOne(id);
  }
}
