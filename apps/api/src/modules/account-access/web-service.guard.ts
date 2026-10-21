import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";

type WebServiceRequest = {
  headers: {
    authorization?: string;
  };
};

// Routes only the Helios web server may call (it reports sign-in attempts it handled, including
// failed ones that come with no user token). Authenticates with WEB_SERVICE_TOKEN, shared by the
// web and the API.
@Injectable()
export class WebServiceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const configuredToken = this.config.get<string>("WEB_SERVICE_TOKEN")?.trim();

    if (!configuredToken) {
      throw new ServiceUnavailableException("WEB_SERVICE_TOKEN is not configured");
    }

    const request = context.switchToHttp().getRequest<WebServiceRequest>();
    const [scheme, suppliedToken] = (request.headers.authorization ?? "").split(" ", 2);

    if (scheme?.toLowerCase() !== "bearer" || !suppliedToken || !this.tokensMatch(configuredToken, suppliedToken)) {
      throw new UnauthorizedException("Web service token is invalid");
    }

    return true;
  }

  private tokensMatch(expected: string, supplied: string) {
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);

    return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
  }
}
