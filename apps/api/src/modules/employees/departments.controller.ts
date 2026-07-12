import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission } from "../auth/permissions.decorator";
import { CreateDepartmentDto, UpdateDepartmentDto } from "./employees.dto";
import { EmployeesService } from "./employees.service";

@ApiTags("departments")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission("employees.department.manage", "system.accounts.manage")
@ApiBearerAuth()
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOkResponse({ description: "Company departments and headcount." })
  findAll(@Query("includeArchived") includeArchived?: string) {
    return this.employeesService.findDepartments(includeArchived === "true");
  }

  @Post()
  @ApiOkResponse({ description: "Create a department." })
  create(@Body() body: CreateDepartmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.createDepartment(body, user.account?.employeeId ?? undefined);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Update department name, parent, or head." })
  update(@Param("id") id: string, @Body() body: UpdateDepartmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.updateDepartment(id, body, user.account?.employeeId ?? undefined);
  }

  @Post(":id/archive")
  @ApiOkResponse({ description: "Archive an empty department without deleting history." })
  archive(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.archiveDepartment(id, user.account?.employeeId ?? undefined);
  }

  @Post(":id/restore")
  @ApiOkResponse({ description: "Restore an archived department." })
  restore(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.restoreDepartment(id, user.account?.employeeId ?? undefined);
  }
}
