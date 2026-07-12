import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission } from "../auth/permissions.decorator";
import { CreateJobPositionDto, CreateJobTitleDto, UpdateJobPositionDto, UpdateJobTitleDto } from "./employees.dto";
import { EmployeesService } from "./employees.service";

@ApiTags("job-catalog")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission("employees.department.manage", "system.accounts.manage")
@ApiBearerAuth()
@Controller()
export class JobCatalogController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get("job-positions")
  @ApiOkResponse({ description: "Job positions for employee profiles." })
  findPositions(@Query("includeArchived") includeArchived?: string) {
    return this.employeesService.findJobPositions(includeArchived === "true");
  }

  @Post("job-positions")
  @ApiOkResponse({ description: "Create a job position." })
  createPosition(@Body() body: CreateJobPositionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.createJobPosition(body, user.account?.employeeId ?? undefined);
  }

  @Patch("job-positions/:id")
  @ApiOkResponse({ description: "Update a job position." })
  updatePosition(@Param("id") id: string, @Body() body: UpdateJobPositionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.updateJobPosition(id, body, user.account?.employeeId ?? undefined);
  }

  @Post("job-positions/:id/archive")
  @ApiOkResponse({ description: "Archive an unused job position." })
  archivePosition(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.archiveJobPosition(id, user.account?.employeeId ?? undefined);
  }

  @Post("job-positions/:id/restore")
  @ApiOkResponse({ description: "Restore an archived job position." })
  restorePosition(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.restoreJobPosition(id, user.account?.employeeId ?? undefined);
  }

  @Get("job-titles")
  @ApiOkResponse({ description: "Job titles/ranks for employee profiles." })
  findTitles(@Query("includeArchived") includeArchived?: string) {
    return this.employeesService.findJobTitles(includeArchived === "true");
  }

  @Post("job-titles")
  @ApiOkResponse({ description: "Create a job title." })
  createTitle(@Body() body: CreateJobTitleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.createJobTitle(body, user.account?.employeeId ?? undefined);
  }

  @Patch("job-titles/:id")
  @ApiOkResponse({ description: "Update a job title." })
  updateTitle(@Param("id") id: string, @Body() body: UpdateJobTitleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.updateJobTitle(id, body, user.account?.employeeId ?? undefined);
  }

  @Post("job-titles/:id/archive")
  @ApiOkResponse({ description: "Archive an unused job title." })
  archiveTitle(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.archiveJobTitle(id, user.account?.employeeId ?? undefined);
  }

  @Post("job-titles/:id/restore")
  @ApiOkResponse({ description: "Restore an archived job title." })
  restoreTitle(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.restoreJobTitle(id, user.account?.employeeId ?? undefined);
  }
}
