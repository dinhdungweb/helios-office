import { Injectable } from "@nestjs/common";
import { payrollCycles } from "../../common/mock-data";

@Injectable()
export class PayrollService {
  findCycles() {
    return payrollCycles;
  }

  getWorkflow() {
    return {
      name: "Payroll v1",
      steps: ["create_cycle", "lock_attendance", "calculate_draft", "hr_review", "leadership_approval", "publish_payslips"],
      currentStep: "hr_review"
    };
  }
}
