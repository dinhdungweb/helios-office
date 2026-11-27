import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from "class-validator";

export class CreateAttendanceDeviceDto {
  @ApiProperty({ example: "VP-01", description: "The id the device sends as device_id when syncing" })
  @IsString()
  @IsNotEmpty({ message: "Nhập mã máy." })
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9._-]+$/, { message: "Mã máy chỉ gồm chữ không dấu, số, dấu chấm, gạch ngang, gạch dưới." })
  deviceId!: string;

  @ApiPropertyOptional({ example: "Máy văn phòng tầng 3" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  deviceName?: string | null;

  @ApiPropertyOptional({ example: "NGT" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(32)
  storeCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  workplaceId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @ApiPropertyOptional({ enum: ["active", "inactive"] })
  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive";
}

// The device id is fixed once created: the machine sends it with every sync.
export class UpdateAttendanceDeviceDto extends PartialType(CreateAttendanceDeviceDto) {}
