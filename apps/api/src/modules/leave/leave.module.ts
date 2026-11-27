import { Module } from "@nestjs/common";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AttendanceCalculationModule } from "../attendance/attendance-calculation.module";
import { AuthModule } from "../auth/auth.module";
import { LeaveBalancesController } from "./leave-balances.controller";
import { LeaveBalancesService } from "./leave-balances.service";
import { LeavePreviewController } from "./leave-preview.controller";
import { LeaveRequestHandler } from "./leave-request.handler";
import { LeaveScheduleService } from "./leave-schedule.service";
import { LeaveTypesController } from "./leave-types.controller";
import { LeaveTypesService } from "./leave-types.service";

// Leave types, balances and the "leave" request type (LV-09 → LV-16). The handler registers itself
// with the approval engine's RequestTypeRegistry on init.
@Module({
  imports: [AuthModule, ApprovalsModule, AttendanceCalculationModule],
  controllers: [LeaveTypesController, LeaveBalancesController, LeavePreviewController],
  providers: [LeaveTypesService, LeaveBalancesService, LeaveScheduleService, LeaveRequestHandler],
  exports: [LeaveBalancesService]
})
export class LeaveModule {}
