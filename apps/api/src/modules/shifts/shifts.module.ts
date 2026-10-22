import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AttendancePolicyController } from "./attendance-policy.controller";
import { ShiftsController } from "./shifts.controller";
import { ShiftsService } from "./shifts.service";

@Module({
  imports: [AuthModule],
  controllers: [ShiftsController, AttendancePolicyController],
  providers: [ShiftsService],
  exports: [ShiftsService]
})
export class ShiftsModule {}
