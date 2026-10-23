import { Module } from "@nestjs/common";
import { AttendanceCalculationModule } from "./attendance-calculation.module";
import { AttendanceConfirmationService } from "./attendance-confirmation.service";
import { AttendanceTimesheetService } from "./attendance-timesheet.service";
import { TimesheetExportHandler } from "./timesheet-export.handler";

// Timesheet reading and its Excel export (AT-16, AT-18, AT-24) without HTTP routes, so the worker
// process can build exports too; AttendanceModule and the worker both import it.
@Module({
  imports: [AttendanceCalculationModule],
  providers: [AttendanceTimesheetService, AttendanceConfirmationService, TimesheetExportHandler],
  exports: [AttendanceTimesheetService, AttendanceConfirmationService]
})
export class AttendanceTransferModule {}
