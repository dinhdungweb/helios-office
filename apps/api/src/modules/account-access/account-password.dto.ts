import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string;
}

// First sign-in after an admin issued a temporary password: Keycloak refuses the password grant
// until the password is changed, so the user proves the temporary one here instead of with a token.
export class ChangeTemporaryPasswordDto extends ChangePasswordDto {
  @ApiProperty({ example: "linhmn" })
  @IsString()
  @MinLength(1)
  @MaxLength(254)
  username!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: "Username or email", example: "linhmn@helios.vn" })
  @IsString()
  @MinLength(1)
  @MaxLength(254)
  login!: string;
}

export const PASSWORD_RESET_METHODS = ["email", "temporary_password"] as const;
export type PasswordResetMethod = (typeof PASSWORD_RESET_METHODS)[number];

export class ResetAccountPasswordDto {
  @ApiProperty({ enum: PASSWORD_RESET_METHODS })
  @IsIn(PASSWORD_RESET_METHODS)
  method!: PasswordResetMethod;

  @ApiPropertyOptional({ description: "temporary_password only; generated when omitted", minLength: PASSWORD_MIN_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  temporaryPassword?: string;

  @ApiPropertyOptional({ default: true, description: "End every Keycloak session of the account" })
  @IsOptional()
  @IsBoolean()
  signOutSessions?: boolean;
}
