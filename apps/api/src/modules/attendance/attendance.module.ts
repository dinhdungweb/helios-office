import { Module } from "@nestjs/common";
import { AttendanceAdjustmentsService } from "./attendance-adjustments.service";
import { AttendanceController } from "./attendance.controller";
import { AttendanceTimesheetService } from "./attendance-timesheet.service";
import { AttendanceCalculationModule } from "./attendance-calculation.module";
import { AttendanceService } from "./attendance.service";
import { AttendanceSyncGuard } from "./attendance-sync.guard";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule, AttendanceCalculationModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceAdjustmentsService, AttendanceTimesheetService, AttendanceSyncGuard]
})
export class AttendanceModule {}
