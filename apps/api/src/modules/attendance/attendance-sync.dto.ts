import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AttendanceSyncLogDto {
  @ApiProperty({ example: "HL-001" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  employee_code!: string;

  @ApiProperty({ example: "2026-07-20 08:27:15" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})?$/)
  punch_time!: string;

  @ApiPropertyOptional({ example: "fingerprint" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  verify_type?: string;
}

export class AttendanceSyncDto {
  @ApiProperty({ example: "MCC_HN_01" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  device_id!: string;

  @ApiPropertyOptional({ example: "HN_NGUYENTRAI" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  store_code?: string;

  @ApiProperty({ type: [AttendanceSyncLogDto] })
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => AttendanceSyncLogDto)
  logs!: AttendanceSyncLogDto[];
}

export type AttendanceSyncErrorResult = {
  employee_code: string;
  punch_time: string;
  error_type: string;
  message: string;
};
