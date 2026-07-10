import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AccountAdminRole, AccountLifecycleStatus, EmployeeStatus, LicensePlan } from "@prisma/client";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

export class CreateEmployeeAccountDto {
  @ApiPropertyOptional({ example: "dung.dd" })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: "Welcome@123" })
  @IsOptional()
  @IsString()
  initialPassword?: string;

  @ApiProperty({ example: "dungdd@helios.vn" })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: "0900000000" })
  @IsOptional()
  @IsString()
  phone?: string;

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

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  sendInviteEmail?: boolean;
}

export class CreateEmployeeDto {
  @ApiProperty({ example: "HL-006" })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: "Mai Ngoc Linh" })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiProperty({ example: "HR Executive" })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiProperty({ example: "dept-hr" })
  @IsString()
  departmentId!: string;

  @ApiPropertyOptional({ example: "emp-001" })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ example: "2026-07-10" })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ enum: EmployeeStatus, default: EmployeeStatus.active })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ example: "official" })
  @IsOptional()
  @IsString()
  employeeType?: string;

  @ApiPropertyOptional({ example: "2026-09-10" })
  @IsOptional()
  @IsDateString()
  officialStartDate?: string;

  @ApiPropertyOptional({ example: "HL-006" })
  @IsOptional()
  @IsString()
  attendanceCode?: string;

  @ApiPropertyOptional({ example: "app_and_device" })
  @IsOptional()
  @IsString()
  attendanceMode?: string;

  @ApiPropertyOptional({ example: "office-standard" })
  @IsOptional()
  @IsString()
  payrollTemplate?: string;

  @ApiPropertyOptional({ example: 26 })
  @IsOptional()
  @IsNumber()
  standardWorkdays?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  createAccount?: boolean;

  @ApiPropertyOptional({ type: CreateEmployeeAccountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEmployeeAccountDto)
  account?: CreateEmployeeAccountDto;
}
