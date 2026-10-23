import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DeviceAuthStatus } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from "class-validator";

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

  @ApiPropertyOptional({ description: "DV-06: web/app check-ins only from an approved device" })
  @IsOptional()
  @IsBoolean()
  requireApprovedDevice?: boolean;

  @ApiPropertyOptional({ description: "AT-14: a photo with every web/app check-in" })
  @IsOptional()
  @IsBoolean()
  requirePhoto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvalRefreshHint?: string;
}

// DV-05: an employee registers the browser or phone they check in from.
export class SubmitMyDeviceDto {
  @ApiProperty({ example: "web-3f1c2a9e-5d1b-4f7a-9c8e-0b2d4e6f8a1c" })
  @IsString()
  @Matches(/^(web|ios|android)-[A-Za-z0-9._-]{8,120}$/, { message: "Mã thiết bị không hợp lệ." })
  deviceId!: string;

  @ApiProperty({ example: "Chrome · Windows" })
  @IsString()
  @IsNotEmpty({ message: "Nhập tên thiết bị." })
  @MaxLength(80)
  deviceName!: string;
}
