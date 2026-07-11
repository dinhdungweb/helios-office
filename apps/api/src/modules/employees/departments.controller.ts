import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { EmployeesService } from "./employees.service";

@ApiTags("departments")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@ApiBearerAuth()
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOkResponse({ description: "Company departments and headcount." })
  findAll() {
    return this.employeesService.findDepartments();
  }
}
