import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";
import type { RequestWithUser } from "./auth.types";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { TwoFactorGateService } from "./two-factor-gate.service";
import { ALLOW_TWO_FACTOR_PENDING_KEY, TWO_FACTOR_STEP_UP_KEY, type TwoFactorStepUpFeature } from "./two-factor.decorators";

// Registered globally (APP_GUARD) and still referenced by controller-level @UseGuards,
// so it must stay idempotent: a request verified once is not verified again.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
    private readonly twoFactorGate: TwoFactorGateService
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    // WebSocket handlers have no HTTP headers to verify; deny them until socket handshake
    // authentication exists (backlog CORE-17).
    if (context.getType() !== "http") {
      return false;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser & { twoFactorChecked?: boolean }>();

    if (!request.user) {
      request.user = await this.authService.verifyAuthorizationHeader(request.headers.authorization);
    }

    if (!request.twoFactorChecked) {
      await this.twoFactorGate.check(request.user, {
        allowPending: this.reflector.getAllAndOverride<boolean>(ALLOW_TWO_FACTOR_PENDING_KEY, [context.getHandler(), context.getClass()]) ?? false,
        stepUp: this.reflector.getAllAndOverride<TwoFactorStepUpFeature>(TWO_FACTOR_STEP_UP_KEY, [context.getHandler(), context.getClass()])
      });
      request.twoFactorChecked = true;
    }

    return true;
  }
}
