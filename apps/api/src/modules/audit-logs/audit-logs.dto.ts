import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { ListQueryDto } from "../../common/pagination/list-query";

export class AuditLogQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ example: "Employee" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  entityId?: string;

  @ApiPropertyOptional({ description: "Account that performed the action." })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  actorAccountId?: string;

  @ApiPropertyOptional({ description: "Action prefix, e.g. 'employee.' or 'http.'" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional({ enum: ["domain", "http"] })
  @IsOptional()
  @IsIn(["domain", "http"])
  source?: "domain" | "http";

  @ApiPropertyOptional({ description: "ISO date/time, inclusive." })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "ISO date/time, inclusive." })
  @IsOptional()
  @IsDateString()
  to?: string;
}
