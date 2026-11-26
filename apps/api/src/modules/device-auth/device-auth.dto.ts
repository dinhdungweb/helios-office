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

  // Like 1Office's Timekeeping settings: GPS and Wifi check-ins each have their own rules.
  @ApiPropertyOptional({ description: "GPS check-in on a day without a shift" })
  @IsOptional()
  @IsBoolean()
  gpsAllowWithoutShift?: boolean;

  @ApiPropertyOptional({ description: "GPS check-in only from an approved device" })
  @IsOptional()
  @IsBoolean()
  gpsRequireApprovedDevice?: boolean;

  @ApiPropertyOptional({ description: "GPS check-in needs a photo" })
  @IsOptional()
  @IsBoolean()
  gpsRequirePhoto?: boolean;

  @ApiPropertyOptional({ description: "GPS check-in only at places of the person's shift" })
  @IsOptional()
  @IsBoolean()
  gpsCheckEntities?: boolean;

  @ApiPropertyOptional({ description: "Wifi / office network check-in on a day without a shift" })
  @IsOptional()
  @IsBoolean()
  wifiAllowWithoutShift?: boolean;

  @ApiPropertyOptional({ description: "Wifi check-in only from an approved device" })
  @IsOptional()
  @IsBoolean()
  wifiRequireApprovedDevice?: boolean;

  @ApiPropertyOptional({ description: "Wifi check-in needs a photo" })
  @IsOptional()
  @IsBoolean()
  wifiRequirePhoto?: boolean;

  @ApiPropertyOptional({ description: "Wifi check-in only at places of the person's shift" })
  @IsOptional()
  @IsBoolean()
  wifiCheckEntities?: boolean;

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
