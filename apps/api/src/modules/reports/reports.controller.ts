import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("executive-dashboard")
  @ApiOkResponse({ description: "Executive HRM and intranet dashboard metrics." })
  getExecutiveDashboard() {
    return this.reportsService.getExecutiveDashboard();
  }
}
