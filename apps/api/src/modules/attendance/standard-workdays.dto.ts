import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

// POST / PATCH /standard-workday-rules (AT-25). PATCH takes the whole rule, like the form sends it.
export class StandardWorkdayRuleDto {
  @ApiProperty({ example: "Khối văn phòng" })
  @IsString()
  @IsNotEmpty({ message: "Nhập tên nhóm." })
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ type: [String], description: "Empty: every department" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  departmentIds?: string[];

  @ApiPropertyOptional({ type: [String], description: "Empty: every position" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  positionIds?: string[];

  @ApiProperty({ enum: ["schedule", "auto", "fixed"] })
  @IsIn(["schedule", "auto", "fixed"])
  mode!: "schedule" | "auto" | "fixed";

  @ApiPropertyOptional({ example: 26, description: "fixed mode: the units" })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(31)
  fixedUnits?: number | null;

  @ApiPropertyOptional({ example: -1, description: "auto mode: added to days minus Sundays" })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-31)
  @Max(31)
  adjustUnits?: number | null;

  @ApiProperty({ example: "2026-11" })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "Tháng áp dụng phải có dạng YYYY-MM." })
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
