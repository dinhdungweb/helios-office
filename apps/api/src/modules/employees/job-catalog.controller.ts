import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission } from "../auth/permissions.decorator";
import { CreateInternalPenaltyDto, CreateJobLevelDto, CreateJobPositionDto, CreateJobTitleDto, CreateWelfareBenefitDto, CreateWelfarePackageDto, CreateWorkplaceDto, UpdateJobPositionDto, UpdateJobTitleDto } from "./employees.dto";
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

  @Delete("job-positions/:id")
  @ApiOkResponse({ description: "Delete an unused job position." })
  deletePosition(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.deleteJobPosition(id, user.account?.employeeId ?? undefined);
  }

  @Get("job-levels")
  @ApiOkResponse({ description: "Job levels used by job titles." })
  findLevels(@Query("includeArchived") includeArchived?: string) {
    return this.employeesService.findJobLevels(includeArchived === "true");
  }

  @Post("job-levels")
  @ApiOkResponse({ description: "Create a job level." })
  createLevel(@Body() body: CreateJobLevelDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.createJobLevel(body, user.account?.employeeId ?? undefined);
  }

  @Delete("job-levels/:id")
  @ApiOkResponse({ description: "Delete a job level." })
  deleteLevel(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.deleteJobLevel(id, user.account?.employeeId ?? undefined);
  }

  @Get("workplaces")
  @ApiOkResponse({ description: "Workplaces used by employee profiles." })
  findWorkplaces(@Query("includeArchived") includeArchived?: string) {
    return this.employeesService.findWorkplaces(includeArchived === "true");
  }

  @Post("workplaces")
  @ApiOkResponse({ description: "Create a workplace." })
  createWorkplace(@Body() body: CreateWorkplaceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.createWorkplace(body, user.account?.employeeId ?? undefined);
  }

  @Delete("workplaces/:id")
  @ApiOkResponse({ description: "Delete a workplace." })
  deleteWorkplace(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.deleteWorkplace(id, user.account?.employeeId ?? undefined);
  }

  @Get("internal-penalties")
  @ApiOkResponse({ description: "Internal penalty catalog." })
  findInternalPenalties(@Query("includeArchived") includeArchived?: string) {
    return this.employeesService.findInternalPenalties(includeArchived === "true");
  }

  @Post("internal-penalties")
  @ApiOkResponse({ description: "Create an internal penalty." })
  createInternalPenalty(@Body() body: CreateInternalPenaltyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.createInternalPenalty(body, user.account?.employeeId ?? undefined);
  }

  @Delete("internal-penalties/:id")
  @ApiOkResponse({ description: "Delete an internal penalty." })
  deleteInternalPenalty(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.deleteInternalPenalty(id, user.account?.employeeId ?? undefined);
  }

  @Get("welfare-benefits")
  @ApiOkResponse({ description: "Welfare benefit catalog." })
  findWelfareBenefits(@Query("includeArchived") includeArchived?: string) {
    return this.employeesService.findWelfareBenefits(includeArchived === "true");
  }

  @Post("welfare-benefits")
  @ApiOkResponse({ description: "Create a welfare benefit." })
  createWelfareBenefit(@Body() body: CreateWelfareBenefitDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.createWelfareBenefit(body, user.account?.employeeId ?? undefined);
  }

  @Delete("welfare-benefits/:id")
  @ApiOkResponse({ description: "Delete a welfare benefit." })
  deleteWelfareBenefit(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.deleteWelfareBenefit(id, user.account?.employeeId ?? undefined);
  }

  @Get("welfare-packages")
  @ApiOkResponse({ description: "Welfare package catalog." })
  findWelfarePackages(@Query("includeArchived") includeArchived?: string) {
    return this.employeesService.findWelfarePackages(includeArchived === "true");
  }

  @Post("welfare-packages")
  @ApiOkResponse({ description: "Create a welfare package." })
  createWelfarePackage(@Body() body: CreateWelfarePackageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.createWelfarePackage(body, user.account?.employeeId ?? undefined);
  }

  @Delete("welfare-packages/:id")
  @ApiOkResponse({ description: "Delete a welfare package." })
  deleteWelfarePackage(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.deleteWelfarePackage(id, user.account?.employeeId ?? undefined);
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

  @Delete("job-titles/:id")
  @ApiOkResponse({ description: "Delete an unused job title." })
  deleteTitle(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.deleteJobTitle(id, user.account?.employeeId ?? undefined);
  }
}
