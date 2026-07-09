import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { approvals } from "../../common/mock-data";

export type ApprovalDecision = "approved" | "rejected";

@Injectable()
export class ApprovalsService {
  findPending() {
    return approvals.filter((approval) => approval.status === "pending");
  }

  decide(id: string, decision: ApprovalDecision) {
    const approval = approvals.find((item) => item.id === id);
    if (!approval) {
      throw new NotFoundException(`Approval ${id} was not found`);
    }
    if (!["approved", "rejected"].includes(decision)) {
      throw new BadRequestException("Decision must be approved or rejected");
    }
    return {
      ...approval,
      status: decision,
      decidedAt: new Date().toISOString()
    };
  }
}
