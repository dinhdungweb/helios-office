import { Module } from "@nestjs/common";
import { NotificationDeliveryService } from "../notifications/notification-delivery.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AttendanceCalculationModule } from "./attendance-calculation.module";
import { AttendanceReminderService } from "./attendance-reminder.service";

// Missing-punch reminders (AT-23), shared by the API (HR sends by hand) and the worker (daily job).
// NotificationsService is provided here directly so the worker does not pull in the socket gateway.
@Module({
  imports: [AttendanceCalculationModule],
  providers: [AttendanceReminderService, NotificationsService, NotificationDeliveryService],
  exports: [AttendanceReminderService]
})
export class AttendanceReminderModule {}
