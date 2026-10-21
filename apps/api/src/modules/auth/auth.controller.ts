import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { AuthenticatedUser } from "./auth.types";
import { SecurityPolicyService } from "./security-policy.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly dataScope: DataScopeService,
    private readonly policies: SecurityPolicyService
  ) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Current authenticated user resolved from a Keycloak bearer token, with data scopes." })
  async me(@CurrentUser() user: AuthenticatedUser) {
    const [grants, sessionPolicy] = await Promise.all([
      user.account ? this.dataScope.grantsFor(user.account.id) : [],
      this.policies.getSessionPolicy()
    ]);

    return {
      sub: user.sub,
      email: user.email,
      name: user.name,
      roles: user.roles,
      account: user.account,
      // Scope per scopable permission the user holds, so the UI can label "Phòng ban" vs "Toàn công ty".
      permissionScopes: Object.fromEntries(grants.filter((grant) => grant.scopable).map((grant) => [grant.key, grant.scope])),
      // AU-19: the page frame signs idle users out with a warning first.
      sessionPolicy: {
        autoLogoutEnabled: sessionPolicy.autoLogoutEnabled,
        idleMinutes: sessionPolicy.idleMinutes,
        warningSeconds: sessionPolicy.warningSeconds
      }
    };
  }
}
