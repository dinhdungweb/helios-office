import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";
import { AuditModule } from "../common/audit/audit.module";
import { DataScopeModule } from "../common/data-scope/data-scope.module";
import { FilesModule } from "../common/files/files.module";
import { ImportExportModule } from "../common/import-export/import-export.module";
import { PrismaModule } from "../common/prisma/prisma.module";
import { QueueModule } from "../common/queue/queue.module";
import { AdminSettingsModule } from "../modules/admin-settings/admin-settings.module";
import { EmployeeTransferModule } from "../modules/employees/employee-transfer.module";
import { NotificationDeliveryService } from "../modules/notifications/notification-delivery.service";
import { EmailProcessor } from "./email.processor";
import { ImportExportProcessor } from "./import-export.processor";
import { NotificationsProcessor } from "./notifications.processor";
import { RealtimeEmitter } from "./realtime-emitter.service";
import { WorkerRuntime } from "./worker-runtime.service";
import { FileCleanupService } from "./file-cleanup.service";

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
    AdminSettingsModule,
    // Imports/exports: the jobs, their handlers and the object storage they read and write.
    FilesModule,
    ImportExportModule,
    EmployeeTransferModule
  ],
  providers: [WorkerRuntime, RealtimeEmitter, NotificationDeliveryService, NotificationsProcessor, EmailProcessor, ImportExportProcessor, FileCleanupService],
  exports: [WorkerRuntime]
})
export class WorkerModule {}
