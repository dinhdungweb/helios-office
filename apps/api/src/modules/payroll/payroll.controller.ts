import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { PayrollService } from "./payroll.service";

@ApiTags("payroll")
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
