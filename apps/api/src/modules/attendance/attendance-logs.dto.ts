import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Matches, MaxLength, ValidateIf } from "class-validator";
import { ListQueryDto } from "../../common/pagination/list-query";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = "Ngày phải có dạng YYYY-MM-DD.";

// GET /attendance/raw-logs: ?from&to (default the last 7 days), employeeId, deviceId, q, page, limit, order.
export class RawLogQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ example: "2026-10-01" })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  from?: string;

  @ApiPropertyOptional({ example: "2026-10-31" })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: DATE_MESSAGE })
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}

// GET /attendance/sync-errors: ?status=open (default) | resolved | all, deviceId, q (code), page, limit.
export class SyncErrorQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ["open", "resolved", "all"] })
  @IsOptional()
  @IsIn(["open", "resolved", "all"])
  status?: "open" | "resolved" | "all";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class ResolveSyncErrorDto {
  @ApiPropertyOptional({ enum: ["assign", "dismiss"], description: "assign: give the code to employeeId; dismiss: ignore with a note" })
  @IsIn(["assign", "dismiss"])
  action!: "assign" | "dismiss";

  @ApiPropertyOptional()
  @ValidateIf((dto: ResolveSyncErrorDto) => dto.action === "assign")
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
