import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AccountAdminRole, AccountLifecycleStatus, EmployeeStatus } from "@prisma/client";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
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

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requirePasswordChange?: boolean;

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

export class CreateEmployeeContractDto {
  @ApiProperty({ example: "indefinite" })
  @IsString()
  type!: string;

  @ApiProperty({ example: "2026-07-20" })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: "2027-07-19" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateEmployeeDocumentDto {
  @IsString()
  fieldName!: string;

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  size!: number;

  @IsString()
  contentBase64!: string;
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

  @ApiPropertyOptional({ example: "HR Executive" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional({ example: "pos-hr-executive" })
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiPropertyOptional({ example: "title-staff" })
  @IsOptional()
  @IsString()
  jobTitleId?: string;

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

  @ApiPropertyOptional({ example: "https://cdn.helios.vn/avatar/hl-006.jpg" })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

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

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  profileData?: Record<string, unknown>;

  @ApiPropertyOptional({ type: CreateEmployeeContractDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEmployeeContractDto)
  contract?: CreateEmployeeContractDto;

  @ApiPropertyOptional({ type: [CreateEmployeeDocumentDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateEmployeeDocumentDto)
  documents?: CreateEmployeeDocumentDto[];

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

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: "HL-006" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiPropertyOptional({ example: "Mai Ngoc Linh" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @ApiPropertyOptional({ example: "HR Executive" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional({ example: "pos-hr-executive", nullable: true })
  @IsOptional()
  @IsString()
  positionId?: string | null;

  @ApiPropertyOptional({ example: "title-staff", nullable: true })
  @IsOptional()
  @IsString()
  jobTitleId?: string | null;

  @ApiPropertyOptional({ example: "dept-hr" })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: "emp-001", nullable: true })
  @IsOptional()
  @IsString()
  managerId?: string | null;

  @ApiPropertyOptional({ example: "2026-07-10" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-09-10", nullable: true })
  @IsOptional()
  @IsDateString()
  officialStartDate?: string | null;

  @ApiPropertyOptional({ example: "2026-12-31", nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ example: "official" })
  @IsOptional()
  @IsString()
  employeeType?: string | null;

  @ApiPropertyOptional({ example: "https://cdn.helios.vn/avatar/hl-006.jpg", nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: "HL-006", nullable: true })
  @IsOptional()
  @IsString()
  attendanceCode?: string | null;

  @ApiPropertyOptional({ example: "app_and_device", nullable: true })
  @IsOptional()
  @IsString()
  attendanceMode?: string | null;

  @ApiPropertyOptional({ example: "office-standard", nullable: true })
  @IsOptional()
  @IsString()
  payrollTemplate?: string | null;

  @ApiPropertyOptional({ example: 26, nullable: true })
  @IsOptional()
  @IsNumber()
  standardWorkdays?: number | null;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  profileData?: Record<string, unknown>;
}

export class LinkEmployeeAccountDto {
  @ApiPropertyOptional({ example: "acc-001", nullable: true })
  @IsOptional()
  @IsString()
  accountId?: string | null;
}

export class CreateDepartmentDto {
  @ApiProperty({ example: "People Operations" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: "dept-company", nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ example: "emp-002", nullable: true })
  @IsOptional()
  @IsString()
  headId?: string | null;

  @ApiPropertyOptional({ enum: ["company", "branch", "department"], default: "department" })
  @IsOptional()
  @IsIn(["company", "branch", "department"])
  permissionStructure?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  departmentType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  businessUnit?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isManagementUnit?: boolean;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: "People Operations" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: "dept-company", nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ example: "emp-002", nullable: true })
  @IsOptional()
  @IsString()
  headId?: string | null;

  @ApiPropertyOptional({ enum: ["company", "branch", "department"] })
  @IsOptional()
  @IsIn(["company", "branch", "department"])
  permissionStructure?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  departmentType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  businessUnit?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isManagementUnit?: boolean;
}

export class CreateJobPositionDto {
  @ApiProperty({ example: "POS-HR" })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: "HR Executive" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: "People Operations" })
  @IsOptional()
  @IsString()
  family?: string;

  @ApiPropertyOptional({ example: "Quan ly ho so nhan su va nghiep vu HRM." })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateJobPositionDto {
  @ApiPropertyOptional({ example: "POS-HR" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiPropertyOptional({ example: "HR Executive" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: "People Operations" })
  @IsOptional()
  @IsString()
  family?: string | null;

  @ApiPropertyOptional({ example: "Quan ly ho so nhan su va nghiep vu HRM." })
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class CreateJobLevelDto {
  @ApiProperty({ example: "Bậc 1" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: "Cấp bậc khởi đầu." })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateWorkplaceDto {
  @ApiProperty({ example: "Văn phòng Hà Nội" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: "123 Nguyễn Trãi" })
  @IsOptional()
  @IsString()
  addressLine?: string;

  @ApiPropertyOptional({ example: "Thanh Xuân, Hà Nội" })
  @IsOptional()
  @IsString()
  administrativeArea?: string;

  @ApiPropertyOptional({ example: "9d37433b-8bc2-483e-80b8-8aa732bd0fbb" })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: "Văn phòng làm việc chính." })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateInternalPenaltyDto {
  @ApiProperty({ example: "Đi muộn" })
  @IsString()
  @MinLength(2)
  violation!: string;

  @ApiProperty({ example: 50000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: "Áp dụng cho mỗi lần vi phạm." })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateWelfareBenefitDto {
  @ApiProperty({ example: "Thưởng sinh nhật" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 500000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: "Áp dụng cho nhân sự đang làm việc chính thức." })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateWelfarePackageItemDto {
  @ApiPropertyOptional({ example: "9d37433b-8bc2-483e-80b8-8aa732bd0fbb" })
  @IsOptional()
  @IsString()
  benefitId?: string;

  @ApiProperty({ example: 500000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: "monthly" })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class CreateWelfarePackageDto {
  @ApiProperty({ example: "Gói phúc lợi nhân viên chính thức" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: "2026-08-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: "9d37433b-8bc2-483e-80b8-8aa732bd0fbb" })
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiPropertyOptional({ example: "9d37433b-8bc2-483e-80b8-8aa732bd0fbb" })
  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @ApiPropertyOptional({ example: "9d37433b-8bc2-483e-80b8-8aa732bd0fbb" })
  @IsOptional()
  @IsString()
  jobLevelId?: string;

  @ApiPropertyOptional({ example: "Áp dụng cho nhân viên chính thức." })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [CreateWelfarePackageItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWelfarePackageItemDto)
  items!: CreateWelfarePackageItemDto[];
}

export class CreateJobTitleDto {
  @ApiProperty({ example: "TTL-MGR" })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: "Truong phong" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number;

  @ApiPropertyOptional({ example: "9d37433b-8bc2-483e-80b8-8aa732bd0fbb" })
  @IsOptional()
  @IsString()
  levelId?: string;

  @ApiPropertyOptional({ example: "Quan ly phong ban va phe duyet nghiep vu trong bo phan." })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateJobTitleDto {
  @ApiPropertyOptional({ example: "TTL-MGR" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiPropertyOptional({ example: "Truong phong" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rank?: number;

  @ApiPropertyOptional({ example: "9d37433b-8bc2-483e-80b8-8aa732bd0fbb", nullable: true })
  @IsOptional()
  @IsString()
  levelId?: string | null;

  @ApiPropertyOptional({ example: "Quan ly phong ban va phe duyet nghiep vu trong bo phan." })
  @IsOptional()
  @IsString()
  description?: string | null;
}
