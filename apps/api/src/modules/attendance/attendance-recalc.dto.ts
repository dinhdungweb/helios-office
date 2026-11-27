import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsString, Matches } from "class-validator";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = "Ngày phải có dạng YYYY-MM-DD.";

export class RecalculateAttendanceDto {
  @ApiProperty({ example: "2026-10-01" })
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  from!: string;

  @ApiProperty({ example: "2026-10-31" })
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  to!: string;

  @ApiPropertyOptional({ type: [String], description: "Only these departments (in your scope)" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsString({ each: true })
  departmentIds?: string[];

  @ApiPropertyOptional({ type: [String], description: "Only these people (in your scope)" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @ArrayUnique()
  @IsString({ each: true })
  employeeIds?: string[];
}
