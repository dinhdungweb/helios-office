import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";

type AttendanceSyncRequest = {
  headers: {
    authorization?: string;
  };
};

@Injectable()
export class AttendanceSyncGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const configuredToken = this.config.get<string>("ATTENDANCE_SYNC_TOKEN")?.trim();

    if (!configuredToken) {
      throw new ServiceUnavailableException("Attendance sync token is not configured");
    }

    const request = context.switchToHttp().getRequest<AttendanceSyncRequest>();
    const authorization = request.headers.authorization ?? "";
    const [scheme, suppliedToken] = authorization.split(" ", 2);

    if (scheme?.toLowerCase() !== "bearer" || !suppliedToken || !this.tokensMatch(configuredToken, suppliedToken)) {
      throw new UnauthorizedException("Attendance sync token is invalid");
    }

    return true;
  }

  private tokensMatch(expected: string, supplied: string) {
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);

    return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
  }
}
