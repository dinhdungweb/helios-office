import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";
import type { RequestWithUser } from "./auth.types";
import { IS_PUBLIC_KEY } from "./public.decorator";

// Registered globally (APP_GUARD) and still referenced by controller-level @UseGuards,
// so it must stay idempotent: a request verified once is not verified again.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector
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

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      request.user = await this.authService.verifyAuthorizationHeader(request.headers.authorization);
    }

    return true;
  }
}
