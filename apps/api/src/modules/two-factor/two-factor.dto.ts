import { ApiProperty } from "@nestjs/swagger";
import { TwoFactorMethod } from "@prisma/client";
import { IsEnum, IsString, Matches } from "class-validator";

export class TwoFactorCodeDto {
  @ApiProperty({ example: "123456" })
  @IsString()
  @Matches(/^\d{4,8}$/, { message: "Mã xác thực gồm 4–8 chữ số." })
  code!: string;
}

export class VerifyTwoFactorDto extends TwoFactorCodeDto {
  @ApiProperty({ enum: TwoFactorMethod })
  @IsEnum(TwoFactorMethod)
  method!: TwoFactorMethod;
}
