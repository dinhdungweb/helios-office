import { ApiPropertyOptional } from "@nestjs/swagger";
import { AttendanceDayStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Matches } from "class-validator";
import { ListQueryDto } from "../../common/pagination/list-query";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = "Ngày phải có dạng YYYY-MM-DD.";

export class MyAttendanceQueryDto {
  @ApiPropertyOptional({ example: "2026-10-01", description: "Default: first day of the current month" })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  from?: string;

  @ApiPropertyOptional({ example: "2026-10-31", description: "Default: today" })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  to?: string;
}

// GET /attendance: ?from&to (default the last 31 days), departmentId, employeeId, status, q, plus
// page / limit / sort (workDate, lateMinutes, earlyMinutes, workedMinutes, workUnits) / order.
export class AttendanceListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ example: "2026-10-01" })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  from?: string;

  @ApiPropertyOptional({ example: "2026-10-31" })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ enum: AttendanceDayStatus })
  @IsOptional()
  @IsEnum(AttendanceDayStatus)
  status?: AttendanceDayStatus;
}
