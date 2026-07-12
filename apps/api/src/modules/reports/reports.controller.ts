import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions("reports.company.view")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("executive-dashboard")
  @ApiOkResponse({ description: "Executive HRM and intranet dashboard metrics." })
  getExecutiveDashboard() {
    return this.reportsService.getExecutiveDashboard();
  }
}
