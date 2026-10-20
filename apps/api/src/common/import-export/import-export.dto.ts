import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateImportDto {
  @ApiProperty({ example: "job_positions", description: "Import type, see GET /imports/types." })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  type!: string;

  @ApiProperty({ description: "A completed upload with purpose import_file and ownerId = your account id." })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fileId!: string;
}

export class CommitImportDto {
  @ApiPropertyOptional({ default: false, description: "Import the valid rows even though some rows have errors." })
  @IsOptional()
  @IsBoolean()
  skipInvalid?: boolean;
}

export class CreateExportDto {
  @ApiProperty({ example: "employees", description: "Export type, see GET /exports/types." })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  type!: string;

  @ApiPropertyOptional({ example: { status: "active" }, description: "Filters understood by the export type." })
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
