import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { HolidayType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateHolidayDto {
  @ApiProperty({ example: "2026-02-17", description: "Calendar date, YYYY-MM-DD" })
  @Matches(DATE_PATTERN, { message: "Ngày phải có dạng YYYY-MM-DD." })
  date!: string;

  @ApiProperty({ example: "Tết Nguyên đán" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ enum: HolidayType, default: HolidayType.holiday })
  @IsOptional()
  @IsEnum(HolidayType)
  type?: HolidayType;

  @ApiPropertyOptional({ default: true, description: "Holidays and company days off: credited as a paid day" })
  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {}

export class HolidayYearQueryDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}

export class AddFixedHolidaysDto {
  @ApiProperty({ example: 2028 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
}
