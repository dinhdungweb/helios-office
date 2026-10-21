import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AUTH_ERROR_CODES, type AuthenticatedUser } from "./auth.types";
import { SecurityPolicyService } from "./security-policy.service";
import type { TwoFactorStepUpFeature } from "./two-factor.decorators";

// Enforces the two-factor policy (AU-18) after the access token is verified. A Keycloak session
// (sid) counts as verified once a TwoFactorSession row exists for it; tokens refreshed in the same
// session keep that status. Called by JwtAuthGuard with the route's metadata.
@Injectable()
export class TwoFactorGateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: SecurityPolicyService
  ) {}

  async check(user: AuthenticatedUser, route: { allowPending: boolean; stepUp?: TwoFactorStepUpFeature }) {
    const policy = await this.policies.getTwoFactorPolicy();
    const needsLogin = policy.enforced && !route.allowPending;
    const needsStepUp = route.stepUp === "payroll" && policy.payrollRequired;

    if (!needsLogin && !needsStepUp) return;

    const verifiedAt = await this.verifiedAt(user);

    if (needsLogin && !verifiedAt) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        code: AUTH_ERROR_CODES.twoFactorRequired,
        message: "This session has not passed two-factor verification"
      });
    }

    if (needsStepUp && (!verifiedAt || verifiedAt.getTime() < Date.now() - policy.verificationMinutes * 60_000)) {
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        code: AUTH_ERROR_CODES.twoFactorStepUpRequired,
        message: "Verify the second factor again to open this feature"
      });
    }
  }

  async verifiedAt(user: AuthenticatedUser) {
    const sessionId = user.claims.sid;
    if (typeof sessionId !== "string" || !user.account) return null;

    const session = await this.prisma.twoFactorSession.findUnique({
      where: { sessionId },
      select: { accountId: true, verifiedAt: true }
    });

    return session && session.accountId === user.account.id ? session.verifiedAt : null;
  }
}
