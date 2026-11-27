import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnprocessableEntityResponse } from "@nestjs/swagger";
import type { Request } from "express";
import { SkipAudit } from "../../common/audit/skip-audit.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CheckInDto } from "./attendance-check-in.dto";
import { AttendanceCheckInService, checkInContext } from "./attendance-check-in.service";

// Every employee checks in for themselves (AT-13); the device policy (DV-06) decides from where.
@ApiTags("attendance")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("attendance")
export class AttendanceCheckInController {
  constructor(
    private readonly checkIns: AttendanceCheckInService,
    private readonly config: ConfigService
  ) {}

  @Post("check-in")
  @HttpCode(200)
  // The punch itself is the record (AttendanceRawLog with device, place and IP).
  @SkipAudit()
  @ApiOkResponse({ description: "Record a check-in from the web or the app and recalculate the day." })
  @ApiUnprocessableEntityResponse({ description: "Refused: device not approved, or not at a valid place; `reason` says which." })
  checkIn(@CurrentUser() user: AuthenticatedUser, @Body() body: CheckInDto, @Req() request: Request) {
    return this.checkIns.punch(user, "in", body, this.context(request));
  }

  @Post("check-out")
  @HttpCode(200)
  @SkipAudit()
  @ApiOkResponse({ description: "Record a check-out from the web or the app and recalculate the day." })
  @ApiUnprocessableEntityResponse({ description: "Refused: device not approved, or not at a valid place; `reason` says which." })
  checkOut(@CurrentUser() user: AuthenticatedUser, @Body() body: CheckInDto, @Req() request: Request) {
    return this.checkIns.punch(user, "out", body, this.context(request));
  }

  @Get("me/punches")
  @ApiOkResponse({ description: "My punches today from every source." })
  todayPunches(@CurrentUser() user: AuthenticatedUser) {
    return this.checkIns.today(user);
  }

  private context(request: Request) {
    return checkInContext(request.headers, request.ip, this.config.get<string>("WEB_SERVICE_TOKEN")?.trim());
  }
}
