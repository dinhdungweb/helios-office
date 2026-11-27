import { ApiPropertyOptional } from "@nestjs/swagger";
import { AttendanceDayStatus } from "@prisma/client";
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
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

// GET /attendance/timesheets: ?month=YYYY-MM (default the current month), departmentId, q, page, limit.
export class TimesheetQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ example: "2026-10" })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "Tháng phải có dạng YYYY-MM." })
  month?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class LockPeriodDto {
  @ApiPropertyOptional({ description: "Note kept with the lock" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UnlockPeriodDto {
  @ApiPropertyOptional({ description: "Why the month is reopened (required)" })
  @IsString()
  @MinLength(3, { message: "Nhập lý do mở chốt." })
  @MaxLength(500)
  reason!: string;
}

export class MyTimesheetQueryDto {
  @ApiPropertyOptional({ example: "2026-10", description: "Default: the current month" })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "Tháng phải có dạng YYYY-MM." })
  month?: string;
}

export class ConfirmTimesheetDto {
  @ApiPropertyOptional({ enum: ["confirm", "feedback"] })
  @IsIn(["confirm", "feedback"])
  action!: "confirm" | "feedback";

  @ApiPropertyOptional({ description: "Required with action = feedback" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}

export class ConfirmationWindowDto {
  @ApiPropertyOptional({ description: "true opens confirmation for the month, false closes it" })
  @IsBoolean()
  open!: boolean;
}

export class ResolveFeedbackDto {
  @ApiPropertyOptional({ description: "How the feedback was handled" })
  @IsString()
  @MinLength(3, { message: "Nhập cách đã xử lý phản hồi." })
  @MaxLength(1000)
  resolution!: string;
}
