import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AttendanceService } from "./attendance.service";

@ApiTags("attendance")
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @ApiOkResponse({ description: "Attendance records from machine imports and PWA check-ins." })
  findRecords() {
    return this.attendanceService.findRecords();
  }

  @Get("summary")
  @ApiOkResponse({ description: "Attendance quality summary for HR review." })
  getSummary() {
    return this.attendanceService.getSummary();
  }
}
