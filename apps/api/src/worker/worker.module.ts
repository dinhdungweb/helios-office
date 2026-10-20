import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";
import { PrismaModule } from "../common/prisma/prisma.module";
import { QueueModule } from "../common/queue/queue.module";
import { WorkerRuntime } from "./worker-runtime.service";

// Root module of the background worker process (src/worker.ts). No HTTP server: it consumes the
// BullMQ queues the API produces into.
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")],
      isGlobal: true
    }),
    PrismaModule,
    QueueModule
  ],
  providers: [WorkerRuntime],
  exports: [WorkerRuntime]
})
export class WorkerModule {}
