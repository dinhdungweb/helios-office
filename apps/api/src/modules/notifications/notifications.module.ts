import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationDeliveryService } from "./notification-delivery.service";
import { NotificationsGateway } from "./notifications.gateway";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationDeliveryService, NotificationsGateway],
  exports: [NotificationsService]
})
export class NotificationsModule {}
