import { Module } from "@nestjs/common";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import { AttendanceRecalcService } from "./attendance-recalc.service";

// Attendance calculation without HTTP routes, shared by the API modules that trigger
// recalculation and by the worker process that runs queued jobs.
@Module({
  providers: [AttendanceCalculationService, AttendanceRecalcService],
  exports: [AttendanceCalculationService, AttendanceRecalcService]
})
export class AttendanceCalculationModule {}
