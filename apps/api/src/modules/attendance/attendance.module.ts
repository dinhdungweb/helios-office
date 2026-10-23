import { Module } from "@nestjs/common";
import { AttendanceAdjustmentsService } from "./attendance-adjustments.service";
import { AttendanceController } from "./attendance.controller";
import { AttendanceDevicesController } from "./attendance-devices.controller";
import { AttendanceDevicesService } from "./attendance-devices.service";
import { AttendanceLocationsController } from "./attendance-locations.controller";
import { AttendanceLocationsService } from "./attendance-locations.service";
import { AttendanceLogsService } from "./attendance-logs.service";
import { AttendanceCalculationModule } from "./attendance-calculation.module";
import { AttendanceReminderModule } from "./attendance-reminder.module";
import { AttendanceTransferModule } from "./attendance-transfer.module";
import { AttendanceService } from "./attendance.service";
import { AttendanceSyncGuard } from "./attendance-sync.guard";
import { StandardWorkdayController } from "./standard-workdays.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule, AttendanceCalculationModule, AttendanceTransferModule, AttendanceReminderModule],
  controllers: [AttendanceController, AttendanceDevicesController, AttendanceLocationsController, StandardWorkdayController],
  providers: [AttendanceService, AttendanceAdjustmentsService, AttendanceDevicesService, AttendanceLocationsService, AttendanceLogsService, AttendanceSyncGuard]
})
export class AttendanceModule {}
