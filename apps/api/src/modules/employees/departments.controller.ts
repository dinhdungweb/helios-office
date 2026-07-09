import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { EmployeesService } from "./employees.service";

@ApiTags("departments")
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOkResponse({ description: "Company departments and headcount." })
  findAll() {
    return this.employeesService.findDepartments();
  }
}
