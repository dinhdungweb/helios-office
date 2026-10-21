import { Body, Controller, Delete, Get, HttpCode, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AllowTwoFactorPending } from "../auth/two-factor.decorators";
import { TwoFactorCodeDto, VerifyTwoFactorDto } from "./two-factor.dto";
import { TwoFactorService } from "./two-factor.service";

// The signed-in user's own second factor (AU-18). Every route here stays reachable while the
// session still has to pass 2FA, except removing the app, which needs a fresh verification.
@ApiTags("auth")
@ApiBearerAuth()
@Controller("auth/two-factor")
export class TwoFactorController {
  constructor(private readonly twoFactor: TwoFactorService) {}

  @Get()
  @AllowTwoFactorPending()
  @ApiOkResponse({ description: "Policy, authenticator app and email availability, and whether this session is verified." })
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactor.status(user);
  }

  @Post("totp/setup")
  @AllowTwoFactorPending()
  @HttpCode(200)
  @ApiOkResponse({ description: "Start authenticator app setup: a new secret and its otpauth:// URL for the QR code." })
  setupTotp(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactor.setupTotp(user);
  }

  @Post("totp/confirm")
  @AllowTwoFactorPending()
  @HttpCode(200)
  @ApiOkResponse({ description: "Finish setup with a code from the app; also verifies this session." })
  confirmTotp(@CurrentUser() user: AuthenticatedUser, @Body() body: TwoFactorCodeDto) {
    return this.twoFactor.confirmTotp(user, body.code);
  }

  @Delete("totp")
  @ApiOkResponse({ description: "Remove the authenticator app (needs a recent verification)." })
  removeTotp(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactor.removeTotp(user);
  }

  @Post("email/send")
  @AllowTwoFactorPending()
  @HttpCode(200)
  @ApiOkResponse({ description: "Email a one-time code to the account's address." })
  sendEmailCode(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactor.sendEmailCode(user);
  }

  @Post("verify")
  @AllowTwoFactorPending()
  @HttpCode(200)
  @ApiOkResponse({ description: "Verify this session with an app or email code." })
  verify(@CurrentUser() user: AuthenticatedUser, @Body() body: VerifyTwoFactorDto) {
    return this.twoFactor.verify(user, body.method, body.code);
  }
}
