import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import { AttendanceService } from "./attendance.service";
import { AttendanceSyncGuard } from "./attendance-sync.guard";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceCalculationService, AttendanceSyncGuard],
  exports: [AttendanceCalculationService]
})
export class AttendanceModule {}
