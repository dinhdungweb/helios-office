import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength
} from "class-validator";

export class UpdateCompanyInfoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hotline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headOffice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  representativeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  representativeTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fiscalYear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateSync?: string;
}

export class UpdateIntranetSettingsDto {
  @ApiPropertyOptional({ enum: ["serious", "engagement", "open"] })
  @IsOptional()
  @IsIn(["serious", "engagement", "open"])
  cultureMode?: "serious" | "engagement" | "open";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postPermission?: string;

  @ApiPropertyOptional({ enum: ["enabled", "disabled", "review"] })
  @IsOptional()
  @IsIn(["enabled", "disabled", "review"])
  postApprovalStatus?: "enabled" | "disabled" | "review";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneVisibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pushNewPost?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chatGroupPublic?: string;
}

export class UpdateModuleConfigDto {
  @ApiPropertyOptional({ example: "hrm" })
  @IsString()
  moduleId!: string;

  @ApiPropertyOptional()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  enabledSettingIds?: string[];
}

export class UpdateSmtpSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: "Microsoft 365" })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: "smtp.office365.com" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  host?: string;

  @ApiPropertyOptional({ example: 587 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ enum: ["none", "starttls", "ssl"] })
  @IsOptional()
  @IsIn(["none", "starttls", "ssl"])
  security?: "none" | "starttls" | "ssl";

  @ApiPropertyOptional({ example: "no-reply@helios.vn" })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: "no-reply@helios.vn" })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @ApiPropertyOptional({ example: "Helios Office" })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional({ example: "support@helios.vn" })
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyLimit?: number;

  @ApiPropertyOptional({ example: "admin@helios.vn" })
  @IsOptional()
  @IsEmail()
  testRecipient?: string;
}

export class TestSmtpSettingsDto {
  @ApiPropertyOptional({ example: "admin@helios.vn" })
  @IsOptional()
  @IsEmail()
  recipient?: string;
}
