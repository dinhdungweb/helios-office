import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { RequestWithUser } from "./auth.types";

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new UnauthorizedException("Authenticated user is required");
    }

    if (request.user.account?.adminRole !== "system_admin") {
      throw new ForbiddenException("System admin role is required");
    }

    return true;
  }
}
