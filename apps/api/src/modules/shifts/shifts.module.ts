import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AttendancePolicyController } from "./attendance-policy.controller";
import { DepartmentShiftController } from "./department-shift.controller";
import { HolidaysController } from "./holidays.controller";
import { HolidaysService } from "./holidays.service";
import { ShiftAssignmentsController } from "./shift-assignments.controller";
import { ShiftAssignmentsService } from "./shift-assignments.service";
import { ShiftsController } from "./shifts.controller";
import { ShiftsService } from "./shifts.service";

@Module({
  imports: [AuthModule],
  controllers: [ShiftsController, AttendancePolicyController, HolidaysController, ShiftAssignmentsController, DepartmentShiftController],
  providers: [ShiftsService, HolidaysService, ShiftAssignmentsService],
  exports: [ShiftsService, HolidaysService, ShiftAssignmentsService]
})
export class ShiftsModule {}
