import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";
import { AuditModule } from "../common/audit/audit.module";
import { DataScopeModule } from "../common/data-scope/data-scope.module";
import { PrismaModule } from "../common/prisma/prisma.module";
import { QueueModule } from "../common/queue/queue.module";
import { AdminSettingsModule } from "../modules/admin-settings/admin-settings.module";
import { NotificationDeliveryService } from "../modules/notifications/notification-delivery.service";
import { EmailProcessor } from "./email.processor";
import { NotificationsProcessor } from "./notifications.processor";
import { RealtimeEmitter } from "./realtime-emitter.service";
import { WorkerRuntime } from "./worker-runtime.service";

// Root module of the background worker process (src/worker.ts). No HTTP server: it consumes the
// BullMQ queues the API produces into. AdminSettingsModule provides the SMTP settings for email.
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")],
      isGlobal: true
    }),
    PrismaModule,
    QueueModule,
    AuditModule,
    // AdminSettingsModule pulls in AuthModule, whose AuthController needs the global DataScopeService.
    DataScopeModule,
    AdminSettingsModule
  ],
  providers: [WorkerRuntime, RealtimeEmitter, NotificationDeliveryService, NotificationsProcessor, EmailProcessor],
  exports: [WorkerRuntime]
})
export class WorkerModule {}
