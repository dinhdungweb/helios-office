import { Injectable } from "@nestjs/common";
import { attendanceRecords } from "../../common/mock-data";

@Injectable()
export class AttendanceService {
  findRecords() {
    return attendanceRecords;
  }

  getSummary() {
    const missing = attendanceRecords.filter((record) => record.status !== "valid").length;
    return {
      totalRecords: attendanceRecords.length,
      validRecords: attendanceRecords.length - missing,
      recordsNeedReview: missing
    };
  }
}
