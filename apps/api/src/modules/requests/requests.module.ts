import { Module } from "@nestjs/common";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AuthModule } from "../auth/auth.module";
import { ApprovalsInboxController } from "./approvals-inbox.controller";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "./requests.service";

@Module({
  imports: [AuthModule, ApprovalsModule],
  controllers: [RequestsController, ApprovalsInboxController],
  providers: [RequestsService],
  exports: [RequestsService]
})
export class RequestsModule {}
