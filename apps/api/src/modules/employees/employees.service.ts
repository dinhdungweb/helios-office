import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

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
}
