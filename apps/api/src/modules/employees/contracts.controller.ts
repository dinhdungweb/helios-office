import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission } from "../auth/permissions.decorator";
import { EmployeesService } from "./employees.service";

@ApiTags("contracts")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission("employees.department.manage", "system.accounts.manage")
@ApiBearerAuth()
@Controller("contracts")
export class ContractsController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOkResponse({ description: "Employee contracts and renewal status." })
  findAll() {
    return this.employeesService.findContracts();
  }
}
