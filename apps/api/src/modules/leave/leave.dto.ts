import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { ListQueryDto } from "../../common/pagination/list-query";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

export class CreateLeaveTypeDto {
  @ApiProperty({ example: "study" })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{1,39}$/, { message: "Mã chỉ gồm chữ thường, số và dấu gạch dưới." })
  code!: string;

  @ApiProperty({ example: "Nghỉ đi học" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() paid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() deductsBalance?: boolean;

  @ApiPropertyOptional({ enum: ["day", "half_day", "hour"] })
  @IsOptional()
  @IsIn(["day", "half_day", "hour"])
  minUnit?: "day" | "half_day" | "hour";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(365)
  maxDaysPerRequest?: number | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresDocument?: boolean;

  @ApiPropertyOptional({ enum: ["all", "male", "female"] })
  @IsOptional()
  @IsIn(["all", "male", "female"])
  gender?: "all" | "male" | "female";

  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowDuringProbation?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateLeaveTypeDto extends PartialType(CreateLeaveTypeDto) {
  @ApiPropertyOptional({ enum: ["active", "archived"] })
  @IsOptional()
  @IsIn(["active", "archived"])
  status?: "active" | "archived";
}

export class LeaveRangeDto {
  @ApiProperty({ example: "2026-12-01" }) @Matches(DATE) fromDate!: string;
  @ApiProperty({ example: "2026-12-01" }) @Matches(DATE) toDate!: string;
  @ApiPropertyOptional({ example: "08:00" }) @IsOptional() @Matches(TIME) fromTime?: string;
  @ApiPropertyOptional({ example: "12:00" }) @IsOptional() @Matches(TIME) toTime?: string;
}

// The payload of a leave request (POST /requests with type "leave").
export class LeavePayloadDto {
  @ApiProperty({ example: "annual" })
  @IsString()
  leaveTypeCode!: string;

  @ApiProperty({ type: [LeaveRangeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => LeaveRangeDto)
  ranges!: LeaveRangeDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reason?: string;
}

export class BalanceQueryDto extends ListQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2100) year?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
}

export class AdjustBalanceDto {
  @ApiProperty() @IsString() employeeId!: string;
  @ApiProperty() @IsString() leaveTypeId!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(2000) @Max(2100) year!: number;
  @ApiProperty({ example: 1.5, description: "Days to add (negative to remove)." }) @Type(() => Number) @IsNumber() amount!: number;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
}

export class PreviewLeaveDto extends LeavePayloadDto {
  @ApiPropertyOptional({ description: "The request being edited, left out of the overlap check." })
  @IsOptional()
  @IsString()
  requestId?: string;
}
