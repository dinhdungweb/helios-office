import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AttendancePolicyController } from "./attendance-policy.controller";
import { HolidaysController } from "./holidays.controller";
import { HolidaysService } from "./holidays.service";
import { ShiftsController } from "./shifts.controller";
import { ShiftsService } from "./shifts.service";

@Module({
  imports: [AuthModule],
  controllers: [ShiftsController, AttendancePolicyController, HolidaysController],
  providers: [ShiftsService, HolidaysService],
  exports: [ShiftsService, HolidaysService]
})
export class ShiftsModule {}
