import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from "class-validator";

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

export const MAX_BULK_DAYS = 366;

export class BulkAssignDto {
  @ApiPropertyOptional({ type: [String], description: "People to schedule (with departmentIds, their union)" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @ArrayUnique()
  @IsString({ each: true })
  employeeIds?: string[];

  @ApiPropertyOptional({ type: [String], description: "Everyone in these departments who is in your scope" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsString({ each: true })
  departmentIds?: string[];

  @ApiProperty({ example: "2026-11-01" })
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  from!: string;

  @ApiProperty({ example: "2027-01-31" })
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  to!: string;

  @ApiProperty({ enum: ["shift", "pattern"] })
  @IsIn(["shift", "pattern"])
  mode!: "shift" | "pattern";

  @ApiPropertyOptional({ nullable: true, description: "mode = shift: the shift, or null for a day off" })
  @ValidateIf((dto: BulkAssignDto) => dto.mode === "shift" && dto.shiftId !== null)
  @IsString()
  shiftId?: string | null;

  @ApiPropertyOptional({ type: [Number], description: "mode = shift: ISO weekdays (1 = Monday … 7 = Sunday); empty or missing = every day" })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays?: number[];

  @ApiPropertyOptional({ description: "mode = pattern" })
  @ValidateIf((dto: BulkAssignDto) => dto.mode === "pattern")
  @IsString()
  patternId?: string;

  @ApiPropertyOptional({ description: "Replace dates that already have an assignment (default true); false keeps them" })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;

  @ApiPropertyOptional({ description: "Only count what would change, without saving" })
  @IsOptional()
  @IsBoolean()
  preview?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200)
  note?: string | null;
}
