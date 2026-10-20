import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { WORKER_HEARTBEAT_TTL_SECONDS } from "../../common/queue/queue.constants";
import { QueueService } from "../../common/queue/queue.service";
import { Public } from "../auth/public.decorator";

type CheckStatus = "up" | "down";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService
  ) {}

  // Public on purpose (load balancers, uptime checks): reports only up/down, no data.
  @Get()
  @Public()
  @ApiOkResponse({ description: "API is serving; status is 'degraded' when Redis or the worker is down." })
  @ApiServiceUnavailableResponse({ description: "The database is unreachable." })
  async check(@Res({ passthrough: true }) response: Response) {
    const [database, redis, heartbeat] = await Promise.all([this.database(), this.queue.ping(), this.queue.workerHeartbeat()]);
    const worker: CheckStatus = heartbeat && Date.now() - Date.parse(heartbeat) < WORKER_HEARTBEAT_TTL_SECONDS * 1_000 ? "up" : "down";
    const checks = { database, redis: (redis ? "up" : "down") as CheckStatus, worker };

    if (database === "down") {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: database === "down" ? "down" : redis && worker === "up" ? "ok" : "degraded",
      checks,
      workerHeartbeatAt: heartbeat,
      time: new Date().toISOString()
    };
  }

  private async database(): Promise<CheckStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "up";
    } catch {
      return "down";
    }
  }
}
