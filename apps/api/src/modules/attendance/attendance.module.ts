import { Module } from "@nestjs/common";
import { AttendanceAdjustmentsService } from "./attendance-adjustments.service";
import { AttendanceController } from "./attendance.controller";
import { AttendanceDevicesController } from "./attendance-devices.controller";
import { AttendanceDevicesService } from "./attendance-devices.service";
import { AttendanceLogsService } from "./attendance-logs.service";
import { AttendanceCalculationModule } from "./attendance-calculation.module";
import { AttendanceTransferModule } from "./attendance-transfer.module";
import { AttendanceService } from "./attendance.service";
import { AttendanceSyncGuard } from "./attendance-sync.guard";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule, AttendanceCalculationModule, AttendanceTransferModule],
  controllers: [AttendanceController, AttendanceDevicesController],
  providers: [AttendanceService, AttendanceAdjustmentsService, AttendanceDevicesService, AttendanceLogsService, AttendanceSyncGuard]
})
export class AttendanceModule {}
