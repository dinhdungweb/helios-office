import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Emitter } from "@socket.io/redis-emitter";
import IORedis from "ioredis";
import { DEFAULT_REDIS_URL } from "../common/queue/queue.constants";
import { accountRoom, NOTIFICATIONS_NAMESPACE } from "../modules/notifications/notification-realtime";

// Publishes Socket.IO events through Redis; the API's RedisIoAdapter delivers them to the sockets
// in the target rooms. The worker never holds client connections itself.
@Injectable()
export class RealtimeEmitter implements OnApplicationShutdown {
  private readonly redis: IORedis;
  private readonly emitter: Emitter;

  constructor(config: ConfigService) {
    this.redis = new IORedis(config.get<string>("REDIS_URL") || DEFAULT_REDIS_URL, { maxRetriesPerRequest: null });
    this.emitter = new Emitter(this.redis);
  }

  toAccount(accountId: string, event: string, payload: unknown) {
    this.emitter.of(NOTIFICATIONS_NAMESPACE).to(accountRoom(accountId)).emit(event, payload);
  }

  onApplicationShutdown() {
    this.redis.disconnect();
  }
}
