import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission, RequirePermissions } from "../auth/permissions.decorator";
import { CreateEmployeeDto, LinkEmployeeAccountDto, UpdateEmployeeDto } from "./employees.dto";
import { EmployeesService } from "./employees.service";

@ApiTags("employees")
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller("employees")
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequireAnyPermission("employees.department.manage", "system.accounts.manage")
  @ApiOkResponse({ description: "Employee directory with current employment status." })
  findAll() {
    return this.employeesService.findAll();
  }

  @Post()
  @RequirePermissions("employees.department.manage")
  @ApiOkResponse({ description: "Create an employee profile and optionally provision a linked user account." })
  create(@Body() body: CreateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.create(body, user.account?.employeeId ?? undefined);
  }

  @Patch(":id")
  @RequirePermissions("employees.department.manage")
  @ApiOkResponse({ description: "Update an employee profile." })
  update(@Param("id") id: string, @Body() body: UpdateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.updateEmployee(id, body, user.account?.employeeId ?? undefined);
  }

  @Patch(":id/account")
  @RequirePermissions("employees.department.manage")
  @ApiOkResponse({ description: "Link or unlink an employee profile with a user account." })
  updateAccount(@Param("id") id: string, @Body() body: LinkEmployeeAccountDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.updateEmployeeAccount(id, body, user.account?.employeeId ?? undefined);
  }

  @Get("org-chart")
  @RequirePermissions("employees.department.manage")
  @ApiOkResponse({ description: "Department tree with department heads and members." })
  getOrgChart() {
    return this.employeesService.getOrgChart();
  }

  @Get(":id")
  @RequireAnyPermission("employees.department.manage", "system.accounts.manage")
  @ApiOkResponse({ description: "Single employee profile." })
  findOne(@Param("id") id: string) {
    return this.employeesService.findOne(id);
  }
}
