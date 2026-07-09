import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { EmployeesService } from "./employees.service";

@ApiTags("contracts")
@Controller("contracts")
export class ContractsController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOkResponse({ description: "Employee contracts and renewal status." })
  findAll() {
    return this.employeesService.findContracts();
  }
}
