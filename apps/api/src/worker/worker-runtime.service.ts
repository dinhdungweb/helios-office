import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, Processor, Worker } from "bullmq";
import IORedis from "ioredis";
import {
  DEFAULT_REDIS_URL,
  QUEUE_PREFIX,
  WORKER_HEARTBEAT_INTERVAL_MS,
  WORKER_HEARTBEAT_KEY,
  WORKER_HEARTBEAT_TTL_SECONDS
} from "../common/queue/queue.constants";

// Owns the worker process's Redis connection, its BullMQ workers and the heartbeat /health reads.
// Processors register themselves in onModuleInit via `register`.
@Injectable()
export class WorkerRuntime implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("Worker");
  private readonly workers: Worker[] = [];
  private readonly connection: IORedis;
  private heartbeat?: NodeJS.Timeout;

  constructor(config: ConfigService) {
    // BullMQ workers need blocking commands, hence maxRetriesPerRequest: null.
    this.connection = new IORedis(config.get<string>("REDIS_URL") || DEFAULT_REDIS_URL, { maxRetriesPerRequest: null });
    this.connection.on("error", (error) => this.logger.warn(`Redis: ${error.message}`));
  }

  register<T>(queueName: string, processor: (job: Job<T>) => Promise<unknown>, concurrency = 5) {
    const worker = new Worker<T>(queueName, processor as Processor<T>, {
      connection: this.connection.duplicate(),
      prefix: QUEUE_PREFIX,
      concurrency
    });

    worker.on("failed", (job, error) =>
      this.logger.error(`${queueName}#${job?.id} ${job?.name} failed (attempt ${job?.attemptsMade}): ${error.message}`)
    );
    worker.on("completed", (job) => this.logger.log(`${queueName}#${job.id} ${job.name} done`));
    this.workers.push(worker);
    this.logger.log(`Listening on queue "${queueName}"`);
  }

  async onModuleInit() {
    const beat = () =>
      this.connection
        .set(WORKER_HEARTBEAT_KEY, new Date().toISOString(), "EX", WORKER_HEARTBEAT_TTL_SECONDS)
        .catch((error: Error) => this.logger.warn(`Heartbeat failed: ${error.message}`));

    await beat();
    this.heartbeat = setInterval(beat, WORKER_HEARTBEAT_INTERVAL_MS);
  }

  async onApplicationShutdown() {
    clearInterval(this.heartbeat);
    await Promise.allSettled(this.workers.map((worker) => worker.close()));
    await this.connection.del(WORKER_HEARTBEAT_KEY).catch(() => undefined);
    this.connection.disconnect();
  }
}
