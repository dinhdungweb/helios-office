import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from "class-validator";

// POST /attendance/check-in and /check-out (AT-13): where the employee is and from which device.
export class CheckInDto {
  @ApiPropertyOptional({ example: "web-3f1c2a9e-5d1b-4f7a-9c8e-0b2d4e6f8a1c", description: "The approved device (DV-05)" })
  @IsOptional()
  @Matches(/^(web|ios|android)-[A-Za-z0-9._-]{8,120}$/, { message: "Mã thiết bị không hợp lệ." })
  deviceId?: string;

  @ApiPropertyOptional({ example: 21.0285 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 105.8542 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 18, description: "GPS accuracy in metres" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @ApiPropertyOptional({ description: "Wifi name, sent by the mobile app" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  ssid?: string;

  @ApiPropertyOptional({ description: "Wifi access point MAC, sent by the mobile app" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  bssid?: string;

  @ApiPropertyOptional({ description: "AT-14: a ready StoredFile of purpose checkin_photo, uploaded by me just before" })
  @IsOptional()
  @IsUUID()
  photoFileId?: string;
}
