import { Module } from "@nestjs/common";
import { AttendanceCalculationService } from "./attendance-calculation.service";
import { AttendancePeriodService } from "./attendance-period.service";
import { AttendanceRecalcService } from "./attendance-recalc.service";
import { StandardWorkdayService } from "./standard-workdays.service";

// Attendance calculation without HTTP routes, shared by the API modules that trigger
// recalculation and by the worker process that runs queued jobs.
@Module({
  providers: [AttendanceCalculationService, AttendanceRecalcService, AttendancePeriodService, StandardWorkdayService],
  exports: [AttendanceCalculationService, AttendanceRecalcService, AttendancePeriodService, StandardWorkdayService]
})
export class AttendanceCalculationModule {}
