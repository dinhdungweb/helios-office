import { INestApplicationContext, Logger } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import IORedis from "ioredis";
import type { ServerOptions } from "socket.io";

const CONNECT_TIMEOUT_MS = 2_000;

// Socket.IO adapter backed by Redis pub/sub so that the worker process (via @socket.io/redis-emitter)
// and any number of API instances reach the same sockets. Without Redis it falls back to the
// in-memory adapter: realtime still works inside this process, but worker pushes are not delivered.
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(redisUrl: string) {
    const publisher = new IORedis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: null, connectTimeout: CONNECT_TIMEOUT_MS });
    const subscriber = publisher.duplicate();

    try {
      await Promise.all([publisher.connect(), subscriber.connect()]);
      this.adapterConstructor = createAdapter(publisher, subscriber);
      this.logger.log("Realtime uses the Redis adapter");
    } catch (error) {
      publisher.disconnect();
      subscriber.disconnect();
      this.logger.warn(`Realtime without Redis (worker events will not reach clients): ${(error as Error).message}`);
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
