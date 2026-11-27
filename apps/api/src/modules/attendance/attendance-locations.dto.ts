import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

// POST / PATCH /attendance-locations (DV-07). PATCH takes the whole place, like the form sends it.
export class AttendanceLocationDto {
  @ApiProperty({ example: "Văn phòng Hà Nội" })
  @IsString()
  @IsNotEmpty({ message: "Nhập tên điểm chấm công." })
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: ["gps", "wifi", "ip"] })
  @IsIn(["gps", "wifi", "ip"])
  type!: "gps" | "wifi" | "ip";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workplaceId?: string | null;

  @ApiPropertyOptional({ example: 21.0285 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({ example: 105.8542 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(5000)
  radiusMeters?: number;

  @ApiPropertyOptional({ example: "Helios-Office" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  ssid?: string | null;

  @ApiPropertyOptional({ example: "a4:2b:b0:12:34:56" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  bssid?: string | null;

  @ApiPropertyOptional({ type: [String], example: ["113.160.12.0/24"] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  ipRanges?: string[];

  @ApiPropertyOptional({ enum: ["active", "inactive"] })
  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
