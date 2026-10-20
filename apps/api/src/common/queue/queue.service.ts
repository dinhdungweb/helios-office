import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JobsOptions, Queue } from "bullmq";
import IORedis from "ioredis";
import { DEFAULT_REDIS_URL, QUEUE_PREFIX, WORKER_HEARTBEAT_KEY } from "./queue.constants";

export class QueueUnavailableError extends Error {
  constructor(cause?: unknown) {
    super(`Redis is unavailable${cause instanceof Error ? `: ${cause.message}` : ""}`);
  }
}

const CONNECT_TIMEOUT_MS = 2_000;

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2_000 },
  removeOnComplete: 1_000,
  removeOnFail: 5_000
};

// Producer side of BullMQ for the API. Connects to Redis lazily, on the first job or health check,
// so the API and its tests start without Redis; callers handle QueueUnavailableError (e.g. the
// notification service falls back to writing straight to the database).
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();
  private connection?: IORedis;

  constructor(private readonly config: ConfigService) {}

  redisUrl() {
    return this.config.get<string>("REDIS_URL") || DEFAULT_REDIS_URL;
  }

  async add<T>(queueName: string, jobName: string, data: T, options?: JobsOptions) {
    const connection = await this.connected();
    let queue = this.queues.get(queueName);

    if (!queue) {
      queue = new Queue(queueName, { connection, prefix: QUEUE_PREFIX });
      this.queues.set(queueName, queue);
    }

    try {
      return await queue.add(jobName, data, { ...defaultJobOptions, ...options });
    } catch (error) {
      throw new QueueUnavailableError(error);
    }
  }

  async ping() {
    try {
      return (await (await this.connected()).ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async workerHeartbeat() {
    try {
      return await (await this.connected()).get(WORKER_HEARTBEAT_KEY);
    } catch {
      return null;
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled([...this.queues.values()].map((queue) => queue.close()));
    if (this.connection && this.connection.status !== "end") {
      this.connection.disconnect();
    }
  }

  private async connected() {
    if (!this.connection) {
      this.connection = new IORedis(this.redisUrl(), {
        lazyConnect: true,
        // Fail fast instead of queueing commands while Redis is down.
        enableOfflineQueue: false,
        maxRetriesPerRequest: null,
        connectTimeout: CONNECT_TIMEOUT_MS,
        retryStrategy: (attempt) => Math.min(attempt * 500, 5_000)
      });
      this.connection.on("error", (error) => this.logger.debug(`Redis: ${error.message}`));
    }

    if (this.connection.status === "ready") {
      return this.connection;
    }

    if (this.connection.status === "wait" || this.connection.status === "end") {
      try {
        await withTimeout(this.connection.connect(), CONNECT_TIMEOUT_MS);
        return this.connection;
      } catch (error) {
        throw new QueueUnavailableError(error);
      }
    }

    // connecting / reconnecting: give it one short chance, then report unavailable.
    try {
      await withTimeout(new Promise((resolve) => this.connection!.once("ready", resolve)), CONNECT_TIMEOUT_MS);
      return this.connection;
    } catch (error) {
      throw new QueueUnavailableError(error);
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms).unref())
  ]);
}
