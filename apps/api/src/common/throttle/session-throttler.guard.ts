import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { createHash } from "node:crypto";

// The web app renders on the server, so every user's API calls arrive from the Next.js server's IP.
// Counting per IP would make the whole company share one quota; count per bearer token instead and
// fall back to the client IP only for requests without one.
@Injectable()
export class SessionThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const authorization = req.headers?.authorization;

    if (typeof authorization === "string" && /^Bearer\s+\S+/i.test(authorization)) {
      return `token:${createHash("sha256").update(authorization).digest("hex")}`;
    }

    return `ip:${req.ips?.length ? req.ips[0] : req.ip}`;
  }

  // WebSocket traffic has no HTTP request to track; it is denied by JwtAuthGuard until CORE-17.
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    return context.getType() !== "http";
  }
}
