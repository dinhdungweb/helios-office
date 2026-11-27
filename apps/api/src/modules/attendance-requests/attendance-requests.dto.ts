import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, Matches, MaxLength, ValidateNested } from "class-validator";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

// Payloads of the attendance-related request types (Phase 3b task 9, docs/design/approval-engine.md §6).
// They arrive inside POST /requests { type, payload } and are checked by each type's handler.

export class AbsenceRangeDto {
  @ApiProperty({ example: "2026-12-01" }) @Matches(DATE) date!: string;
  @ApiProperty({ example: "14:00" }) @Matches(TIME) fromTime!: string;
  @ApiProperty({ example: "16:00" }) @Matches(TIME) toTime!: string;
}

// LV-17: time out during working hours.
export class AbsencePayloadDto {
  @ApiProperty({ enum: ["company", "personal"], description: "company = on company business (counts as worked); personal = taken off the hours worked." })
  @IsIn(["company", "personal"])
  kind!: "company" | "personal";

  @ApiProperty({ type: [AbsenceRangeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AbsenceRangeDto)
  ranges!: AbsenceRangeDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) reason?: string;
}

// LV-18: overtime. An end time not after the start time ends the next day.
export class OvertimePayloadDto {
  @ApiProperty({ example: "2026-12-01" }) @Matches(DATE) date!: string;
  @ApiProperty({ example: "18:00" }) @Matches(TIME) fromTime!: string;
  @ApiProperty({ example: "21:00" }) @Matches(TIME) toTime!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) reason?: string;
}

// LV-20: explanation of a missing / wrong check-in or check-out. At least one time is required.
export class CheckinOutPayloadDto {
  @ApiProperty({ example: "2026-12-01" }) @Matches(DATE) date!: string;
  @ApiPropertyOptional({ example: "08:00" }) @IsOptional() @Matches(TIME) checkIn?: string;
  @ApiPropertyOptional({ example: "17:00" }) @IsOptional() @Matches(TIME) checkOut?: string;
  @ApiProperty() @IsString() @MaxLength(5000) reason!: string;
}

// LV-19: work another shift on a date.
export class ShiftChangePayloadDto {
  @ApiProperty({ example: "2026-12-01" }) @Matches(DATE) date!: string;
  @ApiProperty({ description: "The shift to work instead." }) @IsString() toShiftId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) reason?: string;
}

// LV-21: resignation.
export class ResignationPayloadDto {
  @ApiProperty({ example: "2027-01-15", description: "Last working day." }) @Matches(DATE) lastWorkingDate!: string;
  @ApiProperty() @IsString() @MaxLength(5000) reason!: string;
  @ApiPropertyOptional({ description: "What is handed over, and to whom." }) @IsOptional() @IsString() @MaxLength(5000) handover?: string;
}

export class RequestOptionsQueryDto {
  @ApiProperty({ example: "2026-12-01" }) @Matches(DATE) date!: string;
}
