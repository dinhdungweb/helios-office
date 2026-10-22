import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  LateCountMode,
  MissingPunchMode,
  OutsideShiftMode,
  OvernightAttribution,
  PunchPairingMode,
  ShiftType,
  WorkUnitMode
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf
} from "class-validator";

// Times are minutes after midnight (0–1439) in the company time zone; the web converts HH:MM.

export class CreateShiftDto {
  @ApiProperty({ example: "HC" })
  @IsString()
  @Matches(/^[A-Za-z0-9À-ỹ_-]{1,12}$/, { message: "Mã ca gồm 1–12 ký tự chữ, số, gạch ngang hoặc gạch dưới." })
  code!: string;

  @ApiProperty({ example: "Hành chính" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ enum: ShiftType, default: ShiftType.fixed })
  @IsOptional()
  @IsEnum(ShiftType)
  type?: ShiftType;

  @ApiPropertyOptional({ example: "#2563eb" })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string | null;

  @ApiProperty({ example: 480 })
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute!: number;

  @ApiProperty({ example: 1020 })
  @IsInt()
  @Min(0)
  @Max(1439)
  endMinute!: number;

  @ApiPropertyOptional({ example: 720, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(1439)
  breakStartMinute?: number | null;

  @ApiPropertyOptional({ example: 780, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(1439)
  breakEndMinute?: number | null;

  @ApiPropertyOptional({ description: "Flexible shifts only: minutes to work inside the window", nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(1440)
  requiredMinutes?: number | null;

  @ApiPropertyOptional({ example: 1, description: "Work units for a full shift" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  @Max(3)
  workUnits?: number;

  // Overrides of the company policy; null = use the policy.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(120)
  lateGraceMinutes?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(120)
  earlyGraceMinutes?: number | null;

  @ApiPropertyOptional({ enum: LateCountMode, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(LateCountMode)
  lateCountMode?: LateCountMode | null;

  @ApiPropertyOptional({ enum: MissingPunchMode, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(MissingPunchMode)
  missingPunchMode?: MissingPunchMode | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(720)
  punchWindowBeforeMinutes?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(720)
  punchWindowAfterMinutes?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {}

// AT-06. Fields left out keep their stored value.
export class UpdateAttendancePolicyDto {
  @ApiPropertyOptional({ example: "Asia/Ho_Chi_Minh" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5], description: "ISO weekdays, 1 = Monday … 7 = Sunday" })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  workWeekdays?: number[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  defaultShiftId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  lateGraceMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  earlyGraceMinutes?: number;

  @ApiPropertyOptional({ enum: LateCountMode })
  @IsOptional()
  @IsEnum(LateCountMode)
  lateCountMode?: LateCountMode;

  @ApiPropertyOptional({ enum: [0, 5, 15, 30] })
  @IsOptional()
  @IsIn([0, 5, 15, 30])
  roundingMinutes?: number;

  @ApiPropertyOptional({ enum: PunchPairingMode })
  @IsOptional()
  @IsEnum(PunchPairingMode)
  punchPairing?: PunchPairingMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  punchWindowBeforeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  punchWindowAfterMinutes?: number;

  @ApiPropertyOptional({ enum: OvernightAttribution })
  @IsOptional()
  @IsEnum(OvernightAttribution)
  overnightAttribution?: OvernightAttribution;

  @ApiPropertyOptional({ enum: MissingPunchMode })
  @IsOptional()
  @IsEnum(MissingPunchMode)
  missingPunchMode?: MissingPunchMode;

  @ApiPropertyOptional({ enum: WorkUnitMode })
  @IsOptional()
  @IsEnum(WorkUnitMode)
  workUnitMode?: WorkUnitMode;

  @ApiPropertyOptional({ enum: [1, 25, 50], description: "Rounding step in hundredths of a unit" })
  @IsOptional()
  @IsIn([1, 25, 50])
  workUnitRoundingHundredths?: number;

  @ApiPropertyOptional({ enum: OutsideShiftMode })
  @IsOptional()
  @IsEnum(OutsideShiftMode)
  outsideShiftMode?: OutsideShiftMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(1000)
  overtimeWeekdayPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(1000)
  overtimeRestDayPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(1000)
  overtimeHolidayPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  nightAllowancePercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  holidayPaid?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireTimesheetConfirmation?: boolean;
}
