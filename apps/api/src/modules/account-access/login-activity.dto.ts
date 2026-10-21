import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LoginOutcome } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class RecordLoginEventDto {
  @ApiProperty({ description: "What was typed in the login box" })
  @IsString()
  @MinLength(1)
  @MaxLength(254)
  username!: string;

  @ApiProperty({ enum: LoginOutcome })
  @IsEnum(LoginOutcome)
  outcome!: LoginOutcome;

  @ApiPropertyOptional({ description: "Access token Keycloak issued, when the password was accepted" })
  @IsOptional()
  @IsString()
  @MaxLength(8192)
  accessToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userAgent?: string;
}

export class LoginHistoryQueryDto {
  @ApiPropertyOptional({ default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
