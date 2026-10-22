import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission, RequirePermissions } from "../auth/permissions.decorator";
import { AddFixedHolidaysDto, CreateHolidayDto, HolidayYearQueryDto, UpdateHolidayDto } from "./holidays.dto";
import { HolidaysService } from "./holidays.service";
import { ATTENDANCE_READ_PERMISSIONS, ATTENDANCE_SETUP_PERMISSION } from "./shifts.controller";

@ApiTags("attendance")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequireAnyPermission(...ATTENDANCE_READ_PERMISSIONS)
@ApiBearerAuth()
@Controller("holidays")
export class HolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  @ApiOkResponse({ description: "Holidays, make-up working days and company days off of a year (AT-10)." })
  findByYear(@Query() query: HolidayYearQueryDto) {
    return this.holidays.findByYear(query.year);
  }

  @Post()
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Add a holiday, make-up working day or company day off." })
  create(@Body() body: CreateHolidayDto, @CurrentUser() user: AuthenticatedUser) {
    return this.holidays.create(body, user.account?.employeeId ?? undefined);
  }

  @Post("fixed")
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Add the fixed solar public holidays of a year; existing dates are kept." })
  addFixed(@Body() body: AddFixedHolidaysDto, @CurrentUser() user: AuthenticatedUser) {
    return this.holidays.addFixedHolidays(body.year, user.account?.employeeId ?? undefined);
  }

  @Patch(":id")
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Update a holiday." })
  update(@Param("id") id: string, @Body() body: UpdateHolidayDto, @CurrentUser() user: AuthenticatedUser) {
    return this.holidays.update(id, body, user.account?.employeeId ?? undefined);
  }

  @Delete(":id")
  @RequirePermissions(ATTENDANCE_SETUP_PERMISSION)
  @ApiOkResponse({ description: "Delete a holiday." })
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.holidays.remove(id, user.account?.employeeId ?? undefined);
  }
}
