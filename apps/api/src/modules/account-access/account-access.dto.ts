import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AccountAdminRole, AccountLifecycleStatus, LicensePlan } from "@prisma/client";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
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

  @ApiPropertyOptional({ enum: LicensePlan, default: LicensePlan.standard })
  @IsOptional()
  @IsEnum(LicensePlan)
  licensePlan?: LicensePlan;

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

  @ApiPropertyOptional({ enum: LicensePlan })
  @IsOptional()
  @IsEnum(LicensePlan)
  licensePlan?: LicensePlan;

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

  @ApiPropertyOptional({ enum: LicensePlan, default: LicensePlan.standard })
  @IsOptional()
  @IsEnum(LicensePlan)
  licensePlan?: LicensePlan;

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

  @ApiPropertyOptional({ enum: LicensePlan })
  @IsOptional()
  @IsEnum(LicensePlan)
  licensePlan?: LicensePlan;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys?: string[];
}
