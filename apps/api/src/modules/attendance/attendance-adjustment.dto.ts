import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { AttendanceDayStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";

// Wall-clock time in the company time zone; the date lets a check-out fall on the next day.
const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const LOCAL_TIME_MESSAGE = "Giờ phải có dạng YYYY-MM-DDTHH:mm.";

// HR's manual change to one calculated day (AT-15). Fields left out keep their current value;
// null clears a punch. A reason is required.
export class AdjustAttendanceDto {
  @ApiPropertyOptional({ nullable: true, example: "2026-10-20T08:00", description: "Check-in, company wall-clock time; null = none" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(LOCAL_TIME, { message: LOCAL_TIME_MESSAGE })
  checkIn?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "2026-10-20T17:00" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(LOCAL_TIME, { message: LOCAL_TIME_MESSAGE })
  checkOut?: string | null;

  @ApiPropertyOptional({ nullable: true, description: "Work units HR sets for the day; null = back to the calculated value" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "Số công tối đa 2 chữ số thập phân." })
  @Min(0)
  @Max(3)
  workUnits?: number | null;

  @ApiPropertyOptional({ enum: AttendanceDayStatus, nullable: true, description: "null = back to the calculated status" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(AttendanceDayStatus)
  status?: AttendanceDayStatus | null;

  @ApiProperty({ example: "Máy chấm công hỏng, có xác nhận của quản lý" })
  @IsString()
  @IsNotEmpty({ message: "Nhập lý do sửa công." })
  @MinLength(3, { message: "Lý do quá ngắn." })
  @MaxLength(500)
  reason!: string;
}

export class RevokeAdjustmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
