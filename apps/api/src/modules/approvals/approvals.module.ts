import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";
import { ApprovalWorkflowsController } from "./approval-workflows.controller";
import { ApprovalWorkflowsService } from "./approval-workflows.service";

@Module({
  imports: [AuthModule],
  controllers: [ApprovalsController, ApprovalWorkflowsController],
  providers: [ApprovalsService, ApprovalWorkflowsService],
  exports: [ApprovalsService]
})
export class ApprovalsModule {}
