import { Controller, Get, Param } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { EmployeesService } from "./employees.service";

@ApiTags("employees")
@Controller("employees")
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOkResponse({ description: "Employee directory with current employment status." })
  findAll() {
    return this.employeesService.findAll();
  }

  @Get("org-chart")
  @ApiOkResponse({ description: "Department tree with department heads and members." })
  getOrgChart() {
    return this.employeesService.getOrgChart();
  }

  @Get(":id")
  @ApiOkResponse({ description: "Single employee profile." })
  findOne(@Param("id") id: string) {
    return this.employeesService.findOne(id);
  }
}
