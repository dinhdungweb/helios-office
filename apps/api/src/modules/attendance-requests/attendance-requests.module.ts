import { Module } from "@nestjs/common";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AttendanceCalculationModule } from "../attendance/attendance-calculation.module";
import { AuthModule } from "../auth/auth.module";
import { AbsenceRequestHandler } from "./absence-request.handler";
import { AttendanceRequestOptionsController } from "./attendance-request-options.controller";
import { CheckinOutRequestHandler } from "./checkin-out-request.handler";
import { OvertimeRequestHandler } from "./overtime-request.handler";
import { ResignationRequestHandler } from "./resignation-request.handler";
import { ShiftChangeRequestHandler } from "./shift-change-request.handler";

// The request types besides leave (Phase 3b task 9: LV-17 → LV-21, AT-22). Each handler registers
// itself with the approval engine's RequestTypeRegistry on init, like LeaveRequestHandler.
@Module({
  imports: [AuthModule, ApprovalsModule, AttendanceCalculationModule],
  controllers: [AttendanceRequestOptionsController],
  providers: [AbsenceRequestHandler, OvertimeRequestHandler, CheckinOutRequestHandler, ShiftChangeRequestHandler, ResignationRequestHandler]
})
export class AttendanceRequestsModule {}
