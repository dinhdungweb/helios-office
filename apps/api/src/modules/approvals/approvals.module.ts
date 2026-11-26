import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";
import { ApprovalWorkflowsController } from "./approval-workflows.controller";
import { ApprovalWorkflowsService } from "./approval-workflows.service";
import { ApprovalEngineService } from "./engine/approval-engine.service";
import { ApprovalOrgService } from "./engine/approval-org.service";
import { RequestTypeRegistry } from "./engine/request-types";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ApprovalsController, ApprovalWorkflowsController],
  providers: [ApprovalsService, ApprovalWorkflowsService, ApprovalEngineService, ApprovalOrgService, RequestTypeRegistry],
  exports: [ApprovalsService, ApprovalEngineService, RequestTypeRegistry]
})
export class ApprovalsModule {}
