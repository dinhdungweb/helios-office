import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { AttendanceSyncGuard } from "./attendance-sync.guard";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceSyncGuard]
})
export class AttendanceModule {}
