import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsString, MaxLength, Min, MinLength } from "class-validator";
import { FILE_PURPOSES, type FilePurpose } from "./file-purposes";

const purposes = Object.keys(FILE_PURPOSES);

export class PresignUploadDto {
  @ApiProperty({ example: "hop-dong-lao-dong.pdf" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: "application/pdf" })
  @IsString()
  @MaxLength(150)
  mimeType!: string;

  @ApiProperty({ example: 524288, description: "Declared size in bytes; re-checked against storage on complete." })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size!: number;

  @ApiProperty({ enum: purposes })
  @IsIn(purposes)
  purpose!: FilePurpose;

  @ApiProperty({ example: "emp-001", description: "Record the file belongs to (its type follows from purpose)." })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  ownerId!: string;
}

// Multipart fallback (POST /files): the same fields as form fields, plus the `file` part.
export class DirectUploadDto {
  @ApiProperty({ enum: purposes })
  @IsIn(purposes)
  purpose!: FilePurpose;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  ownerId!: string;
}
