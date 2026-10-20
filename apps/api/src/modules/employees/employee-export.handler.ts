import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common";
import type { EmployeeStatus, Prisma } from "@prisma/client";
import { DataScopeService } from "../../common/data-scope/data-scope.service";
import { ImportExportRegistry } from "../../common/import-export/import-export.registry";
import type { ExportHandler, TransferContext } from "../../common/import-export/import-export.types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EMPLOYEE_DIRECTORY_KEYS } from "./employee-permissions";

type EmployeeExportParams = { status?: EmployeeStatus; departmentId?: string };

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Đang làm việc",
  onboarding: "Đang tiếp nhận",
  offboarding: "Đang nghỉ việc",
  resigned: "Đã nghỉ việc"
};

// Employee directory export (HR-30), limited to the requester's data scope like GET /employees.
@Injectable()
export class EmployeeExportHandler implements ExportHandler<EmployeeExportParams>, OnModuleInit {
  readonly type = "employees";
  readonly title = "Hồ sơ nhân sự";
  readonly permissionKeys = EMPLOYEE_DIRECTORY_KEYS;
  readonly columns = [
    { key: "code", header: "Mã nhân sự" },
    { key: "fullName", header: "Họ và tên", width: 28 },
    { key: "department", header: "Phòng ban", width: 24 },
    { key: "position", header: "Vị trí", width: 24 },
    { key: "jobTitle", header: "Chức danh", width: 24 },
    { key: "manager", header: "Quản lý trực tiếp", width: 28 },
    { key: "status", header: "Trạng thái", width: 18 },
    { key: "employeeType", header: "Loại nhân sự", width: 18 },
    { key: "startDate", header: "Ngày vào làm" },
    { key: "officialStartDate", header: "Ngày chính thức" },
    { key: "email", header: "Email tài khoản", width: 30 },
    { key: "attendanceCode", header: "Mã chấm công" }
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataScope: DataScopeService,
    private readonly registry: ImportExportRegistry
  ) {}

  onModuleInit() {
    this.registry.registerExport(this);
  }

  parseParams(params: unknown): EmployeeExportParams {
    const input = (params ?? {}) as Record<string, unknown>;
    const result: EmployeeExportParams = {};

    if (input.status !== undefined) {
      if (typeof input.status !== "string" || !(input.status in STATUS_LABELS)) throw new BadRequestException("Unknown employee status");
      result.status = input.status as EmployeeStatus;
    }
    if (input.departmentId !== undefined) {
      if (typeof input.departmentId !== "string" || !input.departmentId) throw new BadRequestException("departmentId must be a string");
      result.departmentId = input.departmentId;
    }
    return result;
  }

  async rows(params: EmployeeExportParams, context: TransferContext) {
    const filters: Prisma.EmployeeWhereInput[] = [this.dataScope.employeeWhere(context.scope)];
    if (params.status) filters.push({ status: params.status });
    if (params.departmentId) filters.push({ departmentId: params.departmentId });

    const employees = await this.prisma.employee.findMany({
      where: { AND: filters },
      orderBy: { code: "asc" },
      include: {
        department: { select: { name: true } },
        position: { select: { name: true } },
        jobTitle: { select: { name: true } },
        manager: { select: { fullName: true } },
        userAccount: { select: { email: true } }
      }
    });

    return employees.map((employee) => ({
      code: employee.code,
      fullName: employee.fullName,
      department: employee.department.name,
      position: employee.position?.name ?? null,
      jobTitle: employee.jobTitle?.name ?? employee.title,
      manager: employee.manager?.fullName ?? null,
      status: STATUS_LABELS[employee.status],
      employeeType: employee.employeeType,
      startDate: employee.startDate,
      officialStartDate: employee.officialStartDate,
      email: employee.userAccount?.email ?? null,
      attendanceCode: employee.attendanceCode
    }));
  }

  fileName() {
    return `ho-so-nhan-su-${new Date().toISOString().slice(0, 10)}.xlsx`;
  }
}
