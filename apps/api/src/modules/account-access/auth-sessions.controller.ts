import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { SkipAudit } from "../../common/audit/skip-audit.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { Public } from "../auth/public.decorator";
import { LoginHistoryQueryDto, RecordLoginEventDto } from "./login-activity.dto";
import { LoginActivityService } from "./login-activity.service";
import { WebServiceGuard } from "./web-service.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthSessionsController {
  constructor(private readonly loginActivity: LoginActivityService) {}

  @Get("sessions")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "The signed-in user's Keycloak sessions with the device each started on; `current` marks this one." })
  listSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.loginActivity.listSessions(user);
  }

  @Delete("sessions/:id")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Sign out one of the user's other sessions." })
  revokeSession(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.loginActivity.revokeSession(user, id);
  }

  @Get("login-history")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "The signed-in user's recent sign-in attempts, newest first." })
  loginHistory(@CurrentUser() user: AuthenticatedUser, @Query() query: LoginHistoryQueryDto) {
    return user.account ? this.loginActivity.loginHistory(user.account.id, query.limit) : [];
  }

  // Called by the web server's login route with WEB_SERVICE_TOKEN, never by browsers. The event
  // is itself the record, so the HTTP audit safety net would only duplicate it.
  @Public()
  @UseGuards(WebServiceGuard)
  @SkipAudit()
  @Post("login-events")
  @HttpCode(201)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Record a sign-in attempt handled by the web login page." })
  recordLoginEvent(@Body() body: RecordLoginEventDto) {
    return this.loginActivity.recordLoginEvent(body);
  }
}
