import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { AuthenticatedUser } from "./auth.types";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Current authenticated user resolved from a Keycloak bearer token." })
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      sub: user.sub,
      email: user.email,
      name: user.name,
      roles: user.roles,
      account: user.account
    };
  }
}
