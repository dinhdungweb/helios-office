import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { Public } from "../auth/public.decorator";
import { ChangePasswordDto, ChangeTemporaryPasswordDto, ForgotPasswordDto } from "./account-password.dto";
import { AccountPasswordService } from "./account-password.service";

// The public routes are called by the web server, so the per-IP limit is shared by everyone signing
// in through it; it only caps floods. Guessing is limited by Keycloak's brute force detection and
// forgot-password mail by the per-account cooldown.
const PUBLIC_PASSWORD_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

@ApiTags("auth")
@Controller("auth")
export class AuthPasswordController {
  constructor(private readonly passwords: AccountPasswordService) {}

  @Post("change-password")
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Change the signed-in user's password after checking the current one." })
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() body: ChangePasswordDto) {
    return this.passwords.changeOwnPassword(user, body);
  }

  @Public()
  @Throttle(PUBLIC_PASSWORD_THROTTLE)
  @Post("change-temporary-password")
  @HttpCode(200)
  @ApiOkResponse({ description: "Replace a temporary password; Keycloak refuses sign-in until this is done." })
  changeTemporaryPassword(@Body() body: ChangeTemporaryPasswordDto) {
    return this.passwords.changeTemporaryPassword(body);
  }

  @Public()
  @Throttle(PUBLIC_PASSWORD_THROTTLE)
  @Post("forgot-password")
  @HttpCode(202)
  @ApiOkResponse({ description: "Email a reset link when the login belongs to an active account. Same answer either way." })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.passwords.requestPasswordReset(body);
  }
}
