import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DeviceAuthStatus } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateDeviceAuthStatusDto {
  @ApiProperty({ enum: DeviceAuthStatus, example: DeviceAuthStatus.approved })
  @IsEnum(DeviceAuthStatus)
  status!: DeviceAuthStatus;

  @ApiPropertyOptional({ example: "Approved by HR Ops after employee confirmation." })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateDeviceAuthPolicyDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDevicesPerUser?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireNotificationEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireGpsForAttendance?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireWifiForOffice?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvalRefreshHint?: string;
}
