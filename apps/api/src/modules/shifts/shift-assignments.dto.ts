import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsOptional, IsString, Matches, MaxLength, ValidateIf } from "class-validator";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = "Ngày phải có dạng YYYY-MM-DD.";

export class ScheduleQueryDto {
  @ApiProperty({ example: "2026-10-19" })
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  from!: string;

  @ApiProperty({ example: "2026-10-25" })
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  to!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class AssignShiftsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsString({ each: true })
  employeeIds!: string[];

  @ApiProperty({ type: [String], example: ["2026-10-24"] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(62)
  @ArrayUnique()
  @Matches(DATE_PATTERN, { each: true, message: DATE_MESSAGE })
  dates!: string[];

  @ApiProperty({ nullable: true, description: "null = day off on those dates" })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  shiftId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200)
  note?: string | null;
}

export class ClearAssignmentsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsString({ each: true })
  employeeIds!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(62)
  @ArrayUnique()
  @Matches(DATE_PATTERN, { each: true, message: DATE_MESSAGE })
  dates!: string[];
}

export class DepartmentDefaultShiftDto {
  @ApiProperty({ nullable: true, description: "null = no department default (use the company's)" })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  shiftId!: string | null;
}
