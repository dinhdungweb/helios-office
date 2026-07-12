import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AccountAdminRole, AccountLifecycleStatus } from "@prisma/client";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength
} from "class-validator";

export class CreateUserAccountDto {
  @ApiPropertyOptional({ example: "linhmn" })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: "Welcome@123" })
  @IsOptional()
  @IsString()
  initialPassword?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requirePasswordChange?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  sendInviteEmail?: boolean;

  @ApiProperty({ example: "linhmn@helios.vn" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Mai Ngoc Linh" })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiPropertyOptional({ enum: AccountAdminRole, default: AccountAdminRole.user })
  @IsOptional()
  @IsEnum(AccountAdminRole)
  adminRole?: AccountAdminRole;

  @ApiPropertyOptional({ enum: AccountLifecycleStatus, default: AccountLifecycleStatus.pending_activation })
  @IsOptional()
  @IsEnum(AccountLifecycleStatus)
  accountStatus?: AccountLifecycleStatus;

  @ApiPropertyOptional({ example: "grp-employees" })
  @IsOptional()
  @IsString()
  permissionGroupId?: string;

  @ApiPropertyOptional({ example: "emp-003" })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ type: [String], example: ["requests.personal.create"] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  customPermissionKeys?: string[];

  @ApiPropertyOptional({ example: "Temporary payroll reviewer." })
  @IsOptional()
  @IsString()
  customPermissionNote?: string;
}

export class UpdateUserAccountDto {
  @ApiPropertyOptional({ example: "linhmn@helios.vn" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "Mai Ngoc Linh" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @ApiPropertyOptional({ enum: AccountAdminRole })
  @IsOptional()
  @IsEnum(AccountAdminRole)
  adminRole?: AccountAdminRole;

  @ApiPropertyOptional({ enum: AccountLifecycleStatus })
  @IsOptional()
  @IsEnum(AccountLifecycleStatus)
  accountStatus?: AccountLifecycleStatus;

  @ApiPropertyOptional({ example: "grp-managers", nullable: true })
  @IsOptional()
  @IsString()
  permissionGroupId?: string | null;

  @ApiPropertyOptional({ example: "emp-003", nullable: true })
  @IsOptional()
  @IsString()
  employeeId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  customPermissionKeys?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  customPermissionNote?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  customPermissionsEnabled?: boolean;
}

export class CreatePermissionGroupDto {
  @ApiProperty({ example: "HR Admin" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "Quan tri nhan su va quy trinh HRM." })
  @IsString()
  @MinLength(2)
  description!: string;

  @ApiPropertyOptional({ enum: AccountAdminRole, default: AccountAdminRole.user })
  @IsOptional()
  @IsEnum(AccountAdminRole)
  roleScope?: AccountAdminRole;

  @ApiPropertyOptional({ type: [String], example: ["employees.department.manage"] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys?: string[];
}

export class UpdatePermissionGroupDto {
  @ApiPropertyOptional({ example: "HR Admin" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: "Quan tri nhan su va quy trinh HRM." })
  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @ApiPropertyOptional({ enum: AccountAdminRole })
  @IsOptional()
  @IsEnum(AccountAdminRole)
  roleScope?: AccountAdminRole;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys?: string[];
}

export class CreatePermissionDefinitionDto {
  @ApiProperty({ example: "reports.company.view" })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_-]*)+$/)
  key!: string;

  @ApiProperty({ example: "Báo cáo" })
  @IsString()
  @MinLength(2)
  category!: string;

  @ApiProperty({ example: "Xem báo cáo tổng thể" })
  @IsString()
  @MinLength(2)
  label!: string;

  @ApiPropertyOptional({ example: "Cho phép xem dashboard báo cáo toàn công ty." })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  adminOnly?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePermissionDefinitionDto {
  @ApiPropertyOptional({ example: "Báo cáo" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  category?: string;

  @ApiPropertyOptional({ example: "Xem báo cáo tổng thể" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @ApiPropertyOptional({ example: "Cho phép xem dashboard báo cáo toàn công ty.", nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  adminOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
