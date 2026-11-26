import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from "class-validator";
import { ListQueryDto } from "../../common/pagination/list-query";
import { REQUEST_TYPES, type RequestType } from "../approvals/engine/request-types";

const STATUSES = ["draft", "pending", "returned", "approved", "rejected", "cancelled"] as const;
export const REQUEST_BOXES = ["mine", "to_approve", "processed", "following", "all"] as const;
export type RequestBox = (typeof REQUEST_BOXES)[number];

export class CreateRequestDto {
  @ApiProperty({ enum: REQUEST_TYPES, example: "leave" })
  @IsIn(REQUEST_TYPES)
  type!: RequestType;

  @ApiProperty({ description: "Type-specific data, checked by the type's handler.", example: { leaveTypeCode: "annual", ranges: [{ fromDate: "2026-12-01", toDate: "2026-12-01" }] } })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Send for approval right away instead of saving a draft.", default: false })
  @IsOptional()
  @IsBoolean()
  submit?: boolean;

  @ApiPropertyOptional({ description: "People who follow the request (\"Đối tượng liên quan\")." })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  followerIds?: string[];
}

export class UpdateRequestDto {
  @ApiProperty()
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  followerIds?: string[];

  @ApiPropertyOptional({ description: "Version the editor saw; a newer one means someone else changed it." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}

export class RequestListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: REQUEST_BOXES, default: "mine" })
  @IsOptional()
  @IsIn(REQUEST_BOXES)
  box?: RequestBox;

  @ApiPropertyOptional({ enum: REQUEST_TYPES })
  @IsOptional()
  @IsIn(REQUEST_TYPES)
  type?: RequestType;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiPropertyOptional({ example: "2026-12-01", description: "Requests overlapping [from, to]." })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

export class ReasonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class DecisionDto extends ReasonDto {
  @ApiProperty({ enum: ["approve", "reject"] })
  @IsIn(["approve", "reject"])
  action!: "approve" | "reject";

  @ApiPropertyOptional({ description: "Request version the approver saw." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}

export class ReturnDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}

export class CommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}
