import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LeaveRequestsController } from "./leave-requests.controller";
import { LeaveRequestsService } from "./leave-requests.service";

@Module({
  imports: [AuthModule],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService]
})
export class LeaveRequestsModule {}
