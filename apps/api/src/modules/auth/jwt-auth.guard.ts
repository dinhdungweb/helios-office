import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { RequestWithUser } from "./auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    request.user = await this.authService.verifyAuthorizationHeader(request.headers.authorization);

    return true;
  }
}
