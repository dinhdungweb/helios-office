import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountLifecycleStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { CreateEmployeeDto } from "./employees.dto";

type EmployeeWithDepartment = Prisma.EmployeeGetPayload<{
  include: {
    department: true;
    manager: true;
    userAccount: true;
  };
}>;

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const employees = await this.prisma.employee.findMany({
      include: {
        department: true,
        manager: true,
        userAccount: true
      },
      orderBy: { code: "asc" }
    });

    return employees.map((employee) => this.resolveEmployee(employee));
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        manager: true,
        userAccount: true
      }
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} was not found`);
    }

    return this.resolveEmployee(employee);
  }

  async create(dto: CreateEmployeeDto) {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        let userAccountId: string | undefined;

        if (dto.createAccount) {
          if (!dto.account?.email) {
            throw new BadRequestException("Account email is required when createAccount is enabled");
          }

          const accountStatus = dto.account.accountStatus ?? "pending_activation";
          const keycloakIdentity = dto.account.username?.trim() || dto.account.email;
          const account = await tx.userAccount.create({
            data: {
              keycloakUserId: `local-${keycloakIdentity}`,
              email: dto.account.email,
              displayName: dto.fullName,
              roles: [dto.account.adminRole ?? "user"],
              adminRole: dto.account.adminRole ?? "user",
              licensePlan: dto.account.licensePlan ?? "standard",
              accountStatus,
              permissionGroupId: dto.account.permissionGroupId,
              activatedAt: accountStatus === AccountLifecycleStatus.active ? new Date() : null
            }
          });

          userAccountId = account.id;
        }

        const employee = await tx.employee.create({
          data: {
            code: dto.code,
            fullName: dto.fullName,
            title: dto.title,
            status: dto.status ?? "active",
            startDate: new Date(dto.startDate),
            departmentId: dto.departmentId,
            managerId: dto.managerId,
            userAccountId
          }
        });

        await tx.auditLog.create({
          data: {
            action: "employee.create",
            entityType: "Employee",
            entityId: employee.id,
            afterValue: this.toAuditJson({
              employee,
              auxiliary: {
                employeeType: dto.employeeType,
                officialStartDate: dto.officialStartDate,
                attendanceCode: dto.attendanceCode,
                attendanceMode: dto.attendanceMode,
                payrollTemplate: dto.payrollTemplate,
                standardWorkdays: dto.standardWorkdays,
                createdAccount: Boolean(userAccountId),
                sendInviteEmail: dto.account?.sendInviteEmail
              }
            })
          }
        });

        return employee;
      });

      return this.findOne(created.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Employee code, account username, or account email already exists");
      }

      throw error;
    }
  }

  async findDepartments() {
    const departments = await this.prisma.department.findMany({
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      },
      orderBy: { name: "asc" }
    });

    return departments.map((department) => ({
      ...department,
      headcount: department._count.employees
    }));
  }

  async findContracts() {
    return this.prisma.contract.findMany({
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true
          }
        }
      },
      orderBy: { startDate: "desc" }
    });
  }

  async getOrgChart() {
    const departments = await this.prisma.department.findMany({
      include: {
        employees: {
          include: {
            department: true,
            manager: true,
            userAccount: true
          },
          orderBy: { fullName: "asc" }
        },
        _count: {
          select: {
            employees: true
          }
        }
      },
      orderBy: { name: "asc" }
    });
    const headIds = departments.map((department) => department.headId).filter((id): id is string => Boolean(id));
    const heads = await this.prisma.employee.findMany({
      where: { id: { in: headIds } },
      include: {
        department: true,
        manager: true,
        userAccount: true
      }
    });
    const headsById = new Map(heads.map((employee) => [employee.id, this.resolveEmployee(employee)]));

    return departments.map((department) => ({
      ...department,
      headcount: department._count.employees,
      head: department.headId ? headsById.get(department.headId) ?? null : null,
      members: department.employees.map((employee) => this.resolveEmployee(employee))
    }));
  }

  private resolveEmployee(employee: EmployeeWithDepartment) {
    return {
      ...employee,
      name: employee.fullName,
      department: employee.department.name,
      managerName: employee.manager?.fullName ?? null,
      accountEmail: employee.userAccount?.email ?? null
    };
  }

  private toAuditJson(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
