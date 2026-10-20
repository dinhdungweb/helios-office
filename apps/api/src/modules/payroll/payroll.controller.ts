import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission } from "../auth/permissions.decorator";
import { PayrollService } from "./payroll.service";

@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission("permission.payroll.view", "permission.payroll.manage")
@ApiTags("payroll")
@ApiBearerAuth()
@Controller("payroll-cycles")
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @ApiOkResponse({ description: "Payroll cycles and approval status." })
  findCycles() {
    return this.payrollService.findCycles();
  }

  @Get("workflow")
  @ApiOkResponse({ description: "Payroll workflow steps for the current implementation." })
  getWorkflow() {
    return this.payrollService.getWorkflow();
  }
}
