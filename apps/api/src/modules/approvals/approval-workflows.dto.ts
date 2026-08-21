import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MinLength } from "class-validator";

export class CreateApprovalWorkflowDto {
  @ApiPropertyOptional({ example: "QD-001" })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: "Quyết định" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: ["draft", "active"], example: "active" })
  @IsIn(["draft", "active"])
  status!: "draft" | "active";

  @ApiProperty({ example: "decision" })
  @IsString()
  @MinLength(2)
  objectType!: string;

  @ApiPropertyOptional({ example: "all" })
  @IsOptional()
  @IsString()
  subObject?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  versionMode?: boolean;

  @ApiPropertyOptional({ example: "workflow" })
  @IsOptional()
  @IsString()
  approvalType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  followerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showFlowInObject?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowAttachmentsAfterApproved?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowDocumentChangesAfterApproved?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowDiscussionAfterApproved?: boolean;

  @ApiPropertyOptional({ enum: ["auto_approve", "auto_reject", "substitute", "none"] })
  @IsOptional()
  @IsIn(["auto_approve", "auto_reject", "substitute", "none"])
  overdueAction?: string;

  @ApiProperty({ example: { nodes: [{ id: "start", type: "start" }], edges: [] } })
  @IsObject()
  flowDefinition!: Record<string, unknown>;
}
