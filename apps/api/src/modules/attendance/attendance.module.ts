import { Module } from "@nestjs/common";
import { AttendanceAdjustmentsService } from "./attendance-adjustments.service";
import { AttendanceController } from "./attendance.controller";
import { AttendanceCalculationModule } from "./attendance-calculation.module";
import { AttendanceService } from "./attendance.service";
import { AttendanceSyncGuard } from "./attendance-sync.guard";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule, AttendanceCalculationModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceAdjustmentsService, AttendanceSyncGuard]
})
export class AttendanceModule {}
