import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MyScheduleQueryDto } from "./shift-assignments.dto";
import { ShiftAssignmentsService } from "./shift-assignments.service";

// Everyone may see their own shifts (AT-09); the HR schedule routes need attendance permissions.
@ApiTags("attendance")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("shift-assignments/me")
export class MyShiftsController {
  constructor(private readonly assignments: ShiftAssignmentsService) {}

  @Get()
  @ApiOkResponse({ description: "My shifts for each date in the range (at most 62 days), with holidays." })
  mySchedule(@CurrentUser() user: AuthenticatedUser, @Query() query: MyScheduleQueryDto) {
    return this.assignments.mySchedule(user, query);
  }
}
