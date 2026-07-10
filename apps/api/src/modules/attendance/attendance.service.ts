import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  findRecords() {
    return this.prisma.attendanceRecord.findMany({
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }]
    });
  }

  async getSummary() {
    const totalRecords = await this.prisma.attendanceRecord.count();
    const recordsNeedReview = await this.prisma.attendanceRecord.count({
      where: {
        status: {
          not: "valid"
        }
      }
    });

    return {
      totalRecords,
      validRecords: totalRecords - recordsNeedReview,
      recordsNeedReview
    };
  }
}
