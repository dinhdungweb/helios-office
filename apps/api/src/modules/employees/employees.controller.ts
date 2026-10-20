import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission, RequirePermissions } from "../auth/permissions.decorator";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { EMPLOYEE_DIRECTORY_KEYS, EMPLOYEE_MANAGE_KEYS } from "./employee-permissions";
import { CreateEmployeeDto, LinkEmployeeAccountDto, UpdateEmployeeDto } from "./employees.dto";
import { EmployeesService } from "./employees.service";

// Same keys as the route decorators: the data scope is the widest one among those the caller holds.
const DIRECTORY_KEYS = EMPLOYEE_DIRECTORY_KEYS;
const MANAGE_KEYS = EMPLOYEE_MANAGE_KEYS;

@ApiTags("employees")
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller("employees")
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly dataScope: DataScopeService
  ) {}

  @Get()
  @RequireAnyPermission(...DIRECTORY_KEYS)
  @ApiOkResponse({ description: "Employee directory within the caller's data scope." })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.findAll(await this.dataScope.resolve(user, DIRECTORY_KEYS));
  }

  @Post()
  @RequirePermissions(...MANAGE_KEYS)
  @ApiOkResponse({ description: "Create an employee profile and optionally provision a linked user account." })
  async create(@Body() body: CreateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    const scope = await this.dataScope.resolve(user, MANAGE_KEYS);
    return this.employeesService.create(body, user.account?.employeeId ?? undefined, scope);
  }

  @Patch(":id")
  @RequirePermissions(...MANAGE_KEYS)
  @ApiOkResponse({ description: "Update an employee profile within the caller's data scope." })
  async update(@Param("id") id: string, @Body() body: UpdateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    const scope = await this.dataScope.resolve(user, MANAGE_KEYS);
    return this.employeesService.updateEmployee(id, body, user.account?.employeeId ?? undefined, scope);
  }

  @Patch(":id/account")
  @RequirePermissions(...MANAGE_KEYS)
  @ApiOkResponse({ description: "Link or unlink an employee profile with a user account." })
  async updateAccount(@Param("id") id: string, @Body() body: LinkEmployeeAccountDto, @CurrentUser() user: AuthenticatedUser) {
    const scope = await this.dataScope.resolve(user, MANAGE_KEYS);
    return this.employeesService.updateEmployeeAccount(id, body, user.account?.employeeId ?? undefined, scope);
  }

  @Get("org-chart")
  @RequirePermissions("employees.department.manage")
  @ApiOkResponse({ description: "Department tree with department heads and members." })
  getOrgChart() {
    return this.employeesService.getOrgChart();
  }

  @Get(":id/documents/:documentId")
  @RequireAnyPermission(...DIRECTORY_KEYS)
  async getDocument(
    @Param("id") id: string,
    @Param("documentId") documentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response
  ) {
    const scope = await this.dataScope.resolve(user, DIRECTORY_KEYS);
    const document = await this.employeesService.getDocument(id, documentId, scope);
    response.setHeader("Content-Type", document.mimeType);
    response.setHeader("Content-Length", document.size.toString());
    response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}`);
    response.send(document.content);
  }

  @Get(":id")
  @RequireAnyPermission(...DIRECTORY_KEYS)
  @ApiOkResponse({ description: "Single employee profile; 404 outside the caller's data scope." })
  async findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.findOneInScope(id, await this.dataScope.resolve(user, DIRECTORY_KEYS));
  }
}
