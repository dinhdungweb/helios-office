import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateEmployeeDto } from "./employees.dto";
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

  @Post()
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Create an employee profile and optionally provision a linked user account." })
  create(@Body() body: CreateEmployeeDto) {
    return this.employeesService.create(body);
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
