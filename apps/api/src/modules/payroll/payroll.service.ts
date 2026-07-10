import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  findCycles() {
    return this.prisma.payrollCycle.findMany({
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                code: true,
                fullName: true
              }
            }
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: { periodStart: "desc" }
    });
  }

  getWorkflow() {
    return {
      name: "Payroll v1",
      steps: ["create_cycle", "lock_attendance", "calculate_draft", "hr_review", "leadership_approval", "publish_payslips"],
      currentStep: "hr_review"
    };
  }
}
