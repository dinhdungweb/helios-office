import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

export const MAX_PATTERN_DAYS = 62;

export class CreateShiftPatternDto {
  @ApiProperty({ example: "Hai tuần ngày / đêm" })
  @IsString()
  @IsNotEmpty({ message: "Nhập tên mẫu." })
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    type: [String],
    nullable: true,
    description: "Shift id for each day of the cycle; null = day off. The cycle repeats from the first scheduled date.",
    example: ["shift-hc", "shift-hc", null]
  })
  @IsArray()
  @ArrayMinSize(1, { message: "Mẫu cần ít nhất 1 ngày." })
  @ArrayMaxSize(MAX_PATTERN_DAYS, { message: `Mẫu dài tối đa ${MAX_PATTERN_DAYS} ngày.` })
  // Each entry (string or null) is checked against the shift catalogue in the service.
  days!: Array<string | null>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

export class UpdateShiftPatternDto extends PartialType(CreateShiftPatternDto) {}
