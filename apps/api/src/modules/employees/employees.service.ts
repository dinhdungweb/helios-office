import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountLifecycleStatus, DepartmentStatus, JobCatalogStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AdminSettingsService } from "../admin-settings/admin-settings.service";
import { KeycloakAdminService } from "../auth/keycloak-admin.service";
import type {
  CreateDepartmentDto,
  CreateEmployeeDto,
  CreateInternalPenaltyDto,
  CreateJobLevelDto,
  CreateJobPositionDto,
  CreateJobTitleDto,
  CreateWelfareBenefitDto,
  CreateWelfarePackageDto,
  CreateWorkplaceDto,
  LinkEmployeeAccountDto,
  UpdateDepartmentDto,
  UpdateEmployeeDto,
  UpdateJobPositionDto,
  UpdateJobTitleDto
} from "./employees.dto";

const employeeInclude = {
  department: true,
  position: true,
  jobTitle: true,
  manager: true,
  userAccount: true,
  contracts: {
    orderBy: { startDate: "desc" }
  },
  documents: {
    select: {
      id: true,
      fieldName: true,
      fileName: true,
      mimeType: true,
      size: true,
      createdAt: true
    },
    orderBy: { createdAt: "asc" }
  }
} satisfies Prisma.EmployeeInclude;

type EmployeeWithDepartment = Prisma.EmployeeGetPayload<{
  include: typeof employeeInclude;
}>;

const departmentInclude = {
  parent: {
    select: {
      id: true,
      name: true
    }
  },
  _count: {
    select: {
      children: true,
      employees: true
    }
  }
} satisfies Prisma.DepartmentInclude;

type DepartmentWithCounts = Prisma.DepartmentGetPayload<{
  include: typeof departmentInclude;
}>;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
    private readonly config: ConfigService,
    private readonly adminSettings: AdminSettingsService
  ) {}

  async findAll() {
    const employees = await this.prisma.employee.findMany({
      include: employeeInclude,
      orderBy: { code: "asc" }
    });

    return employees.map((employee) => this.resolveEmployee(employee));
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: employeeInclude
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} was not found`);
    }

    return this.resolveEmployee(employee);
  }

  async getDocument(employeeId: string, documentId: string) {
    const document = await this.prisma.employeeDocument.findFirst({
      where: { id: documentId, employeeId }
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} was not found`);
    }

    return document;
  }

  async create(dto: CreateEmployeeDto, actorId?: string) {
    try {
      await this.assertEmployeeDepartment(dto.departmentId);
      await this.assertEmployeeManager(dto.managerId, undefined);
      const jobCatalog = await this.resolveEmployeeJobCatalog(dto);
      const provisionedAccount = dto.createAccount
        ? await this.provisionAccountIdentity(dto)
        : null;

      const created = await this.prisma.$transaction(async (tx) => {
        let userAccountId: string | undefined;

        if (dto.createAccount) {
          if (!dto.account?.email) {
            throw new BadRequestException("Account email is required when createAccount is enabled");
          }

          const accountStatus = dto.account.accountStatus ?? "pending_activation";
          const keycloakIdentity = dto.account.username?.trim() || dto.account.email;
          const requirePasswordChange = dto.account.requirePasswordChange ?? true;
          const account = await tx.userAccount.create({
            data: {
              keycloakUserId: provisionedAccount?.id ?? `local-${keycloakIdentity}`,
              email: dto.account.email,
              displayName: dto.fullName,
              roles: [dto.account.adminRole ?? "user"],
              adminRole: dto.account.adminRole ?? "user",
              accountStatus,
              permissionGroupId: dto.account.permissionGroupId,
              passwordResetRequired: requirePasswordChange,
              temporaryPasswordIssuedAt: dto.account.initialPassword ? new Date() : null,
              inviteEmailRequested: dto.account.sendInviteEmail ?? false,
              activatedAt: accountStatus === AccountLifecycleStatus.active ? new Date() : null
            }
          });

          userAccountId = account.id;

          await tx.auditLog.create({
            data: {
              actorId,
              action: "account.create",
              entityType: "UserAccount",
              entityId: account.id,
              afterValue: this.toAuditJson(account)
            }
          });
        }

        const employee = await tx.employee.create({
          data: {
            code: dto.code,
            fullName: dto.fullName,
            title: jobCatalog.displayTitle,
            positionId: jobCatalog.positionId,
            jobTitleId: jobCatalog.jobTitleId,
            status: dto.status ?? "active",
            startDate: new Date(dto.startDate),
            officialStartDate: dto.officialStartDate ? new Date(dto.officialStartDate) : null,
            employeeType: dto.employeeType ?? null,
            avatarUrl: dto.avatarUrl ?? null,
            attendanceCode: dto.attendanceCode ?? dto.code,
            attendanceMode: dto.attendanceMode ?? null,
            payrollTemplate: dto.payrollTemplate ?? null,
            standardWorkdays: dto.standardWorkdays ?? null,
            profileData: dto.profileData as Prisma.InputJsonValue | undefined,
            departmentId: dto.departmentId,
            managerId: dto.managerId,
            userAccountId
          }
        });

        if (dto.contract) {
          await tx.contract.create({
            data: {
              employeeId: employee.id,
              type: dto.contract.type,
              startDate: new Date(dto.contract.startDate),
              endDate: dto.contract.endDate ? new Date(dto.contract.endDate) : null,
              status: "active"
            }
          });
        }

        if (dto.documents?.length) {
          await tx.employeeDocument.createMany({
            data: dto.documents.map((document) => ({
              employeeId: employee.id,
              fieldName: document.fieldName,
              fileName: document.fileName,
              mimeType: document.mimeType || "application/octet-stream",
              size: document.size,
              content: Buffer.from(document.contentBase64, "base64")
            }))
          });
        }

        await tx.auditLog.create({
          data: {
            actorId,
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
                requirePasswordChange: dto.account?.requirePasswordChange ?? true,
                sendInviteEmail: dto.account?.sendInviteEmail
              }
            })
          }
        });

        return { employee, userAccountId };
      });

      if (created.userAccountId) {
        await this.deliverInviteIfReady(created.userAccountId, actorId);
      }

      return this.findOne(created.employee.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Employee code, attendance code, account username, or account email already exists");
      }

      throw error;
    }
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto, actorId?: string) {
    const before = await this.prisma.employee.findUnique({
      where: { id },
      include: employeeInclude
    });

    if (!before) {
      throw new NotFoundException(`Employee ${id} was not found`);
    }

    if (dto.departmentId !== undefined) {
      await this.assertEmployeeDepartment(dto.departmentId);
    }

    if (dto.managerId !== undefined) {
      await this.assertEmployeeManager(dto.managerId, id);
    }

    const jobCatalog = await this.resolveEmployeeJobCatalogForUpdate(before, dto);

    try {
      const employee = await this.prisma.employee.update({
        where: { id },
        data: {
          code: dto.code,
          fullName: dto.fullName,
          title: jobCatalog.displayTitle,
          positionId: jobCatalog.positionId,
          jobTitleId: jobCatalog.jobTitleId,
          status: dto.status,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          officialStartDate: dto.officialStartDate === undefined ? undefined : dto.officialStartDate ? new Date(dto.officialStartDate) : null,
          endDate: dto.endDate === undefined ? undefined : dto.endDate ? new Date(dto.endDate) : null,
          employeeType: dto.employeeType,
          avatarUrl: dto.avatarUrl,
          attendanceCode: dto.attendanceCode,
          attendanceMode: dto.attendanceMode,
          payrollTemplate: dto.payrollTemplate,
          standardWorkdays: dto.standardWorkdays,
          profileData: dto.profileData as Prisma.InputJsonValue | undefined,
          departmentId: dto.departmentId,
          managerId: dto.managerId
        },
        include: employeeInclude
      });

      await this.writeEmployeeAudit("employee.update", "Employee", employee.id, before, employee, actorId);

      return this.resolveEmployee(employee);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Employee code or attendance code already exists");
      }

      throw error;
    }
  }

  async updateEmployeeAccount(id: string, dto: LinkEmployeeAccountDto, actorId?: string) {
    const before = await this.prisma.employee.findUnique({
      where: { id },
      include: employeeInclude
    });

    if (!before) {
      throw new NotFoundException(`Employee ${id} was not found`);
    }

    const accountId = dto.accountId ?? null;

    if (accountId) {
      const account = await this.prisma.userAccount.findUnique({
        where: { id: accountId },
        include: {
          employee: true
        }
      });

      if (!account) {
        throw new NotFoundException(`User account ${accountId} was not found`);
      }

      if (account.employee && account.employee.id !== id) {
        throw new ConflictException("This account is already linked to another employee");
      }
    }

    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        userAccountId: accountId
      },
      include: employeeInclude
    });

    await this.writeEmployeeAudit("employee.account.update", "Employee", employee.id, before, employee, actorId);

    return this.resolveEmployee(employee);
  }

  async findDepartments(includeArchived = false) {
    const departments = await this.prisma.department.findMany({
      where: includeArchived ? undefined : { status: DepartmentStatus.active },
      include: departmentInclude,
      orderBy: [{ status: "asc" }, { code: "asc" }]
    });

    return Promise.all(departments.map((department) => this.resolveDepartment(department)));
  }

  async createDepartment(dto: CreateDepartmentDto, actorId?: string) {
    await this.assertDepartmentParent(dto.parentId);
    await this.assertDepartmentHead(dto.headId);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = await this.generateDepartmentCode();

      try {
        const department = await this.prisma.department.create({
          data: {
            code,
            name: dto.name,
            parentId: dto.parentId ?? null,
            headId: dto.headId ?? null,
            permissionStructure: dto.permissionStructure ?? "department",
            departmentType: dto.departmentType ?? null,
            businessUnit: dto.businessUnit ?? null,
            description: dto.description ?? null,
            isManagementUnit: dto.isManagementUnit ?? false
          },
          include: departmentInclude
        });

        await this.writeEmployeeAudit("department.create", "Department", department.id, null, department, actorId);

        return this.resolveDepartment(department);
      } catch (error) {
        if (this.isUniqueConstraintError(error, "code")) {
          continue;
        }

        if (this.isUniqueConstraintError(error)) {
          throw new ConflictException(`Department "${dto.name}" already exists`);
        }

        throw error;
      }
    }

    throw new ConflictException("Could not generate a unique department code");
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto, actorId?: string) {
    const before = await this.prisma.department.findUnique({
      where: { id },
      include: departmentInclude
    });

    if (!before) {
      throw new NotFoundException(`Department ${id} was not found`);
    }

    if (before.status === DepartmentStatus.archived) {
      throw new ConflictException("Archived departments cannot be updated");
    }

    if (dto.parentId !== undefined) {
      await this.assertDepartmentParent(dto.parentId, id);
    }

    if (dto.headId !== undefined) {
      await this.assertDepartmentHead(dto.headId);
    }

    try {
      const department = await this.prisma.department.update({
        where: { id },
        data: {
          name: dto.name,
          parentId: dto.parentId,
          headId: dto.headId,
          permissionStructure: dto.permissionStructure,
          departmentType: dto.departmentType,
          businessUnit: dto.businessUnit,
          description: dto.description,
          isManagementUnit: dto.isManagementUnit
        },
        include: departmentInclude
      });

      await this.writeEmployeeAudit("department.update", "Department", department.id, before, department, actorId);

      return this.resolveDepartment(department);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException(`Department "${dto.name}" already exists`);
      }

      throw error;
    }
  }

  async archiveDepartment(id: string, actorId?: string) {
    const before = await this.prisma.department.findUnique({
      where: { id },
      include: departmentInclude
    });

    if (!before) {
      throw new NotFoundException(`Department ${id} was not found`);
    }

    if (before.status === DepartmentStatus.archived) {
      return this.resolveDepartment(before);
    }

    if (before._count.employees > 0 || before._count.children > 0) {
      throw new ConflictException("Move employees and child departments before archiving this department");
    }

    const department = await this.prisma.department.update({
      where: { id },
      data: {
        status: DepartmentStatus.archived,
        archivedAt: new Date()
      },
      include: departmentInclude
    });

    await this.writeEmployeeAudit("department.archive", "Department", department.id, before, department, actorId);

    return this.resolveDepartment(department);
  }

  async restoreDepartment(id: string, actorId?: string) {
    const before = await this.prisma.department.findUnique({
      where: { id },
      include: departmentInclude
    });

    if (!before) {
      throw new NotFoundException(`Department ${id} was not found`);
    }

    if (before.status === DepartmentStatus.active) {
      return this.resolveDepartment(before);
    }

    if (before.parentId) {
      const parent = await this.prisma.department.findUnique({
        where: { id: before.parentId },
        select: { status: true }
      });

      if (parent?.status === DepartmentStatus.archived) {
        throw new ConflictException("Restore the parent department before restoring this department");
      }
    }

    const department = await this.prisma.department.update({
      where: { id },
      data: {
        status: DepartmentStatus.active,
        archivedAt: null
      },
      include: departmentInclude
    });

    await this.writeEmployeeAudit("department.restore", "Department", department.id, before, department, actorId);

    return this.resolveDepartment(department);
  }

  async deleteDepartment(id: string, actorId?: string) {
    const before = await this.prisma.department.findUnique({
      where: { id },
      include: departmentInclude
    });

    if (!before) {
      throw new NotFoundException(`Department ${id} was not found`);
    }

    if (before.status !== DepartmentStatus.archived) {
      throw new ConflictException("Archive the department before permanently deleting it");
    }

    if (before._count.employees > 0 || before._count.children > 0) {
      throw new ConflictException("Move employees and child departments before deleting this department");
    }

    await this.prisma.department.delete({ where: { id } });
    await this.writeEmployeeAudit("department.delete", "Department", id, before, null, actorId);

    return { id, deleted: true };
  }

  async findJobPositions(includeArchived = false) {
    const positions = await this.prisma.jobPosition.findMany({
      where: includeArchived ? undefined : { status: JobCatalogStatus.active },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      },
      orderBy: [{ status: "asc" }, { name: "asc" }]
    });

    return positions.map(({ _count, ...position }) => ({
      ...position,
      employeeCount: _count.employees
    }));
  }

  async createJobPosition(dto: CreateJobPositionDto, actorId?: string) {
    try {
      const position = await this.prisma.jobPosition.create({
        data: {
          code: dto.code,
          name: dto.name,
          family: dto.family ?? null,
          description: dto.description ?? null
        },
        include: {
          _count: {
            select: {
              employees: true
            }
          }
        }
      });

      await this.writeEmployeeAudit("job_position.create", "JobPosition", position.id, null, position, actorId);

      const { _count, ...positionData } = position;
      return { ...positionData, employeeCount: _count.employees };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Position code or name already exists");
      }

      throw error;
    }
  }

  async updateJobPosition(id: string, dto: UpdateJobPositionDto, actorId?: string) {
    const before = await this.prisma.jobPosition.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    });

    if (!before) {
      throw new NotFoundException(`Job position ${id} was not found`);
    }

    if (before.status === JobCatalogStatus.archived) {
      throw new ConflictException("Archived positions cannot be updated");
    }

    try {
      const position = await this.prisma.jobPosition.update({
        where: { id },
        data: {
          code: dto.code,
          name: dto.name,
          family: dto.family,
          description: dto.description
        },
        include: {
          _count: {
            select: {
              employees: true
            }
          }
        }
      });

      await this.writeEmployeeAudit("job_position.update", "JobPosition", position.id, before, position, actorId);

      const { _count, ...positionData } = position;
      return { ...positionData, employeeCount: _count.employees };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Position code or name already exists");
      }

      throw error;
    }
  }

  async archiveJobPosition(id: string, actorId?: string) {
    const before = await this.prisma.jobPosition.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    });

    if (!before) {
      throw new NotFoundException(`Job position ${id} was not found`);
    }

    if (before.status === JobCatalogStatus.archived) {
      const { _count, ...positionData } = before;
      return { ...positionData, employeeCount: _count.employees };
    }

    if (before._count.employees > 0) {
      throw new ConflictException("Move employees out of this position before archiving it");
    }

    const position = await this.prisma.jobPosition.update({
      where: { id },
      data: {
        status: JobCatalogStatus.archived,
        archivedAt: new Date()
      },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    });

    await this.writeEmployeeAudit("job_position.archive", "JobPosition", position.id, before, position, actorId);

    const { _count, ...positionData } = position;
    return { ...positionData, employeeCount: _count.employees };
  }

  async restoreJobPosition(id: string, actorId?: string) {
    const before = await this.prisma.jobPosition.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    });

    if (!before) {
      throw new NotFoundException(`Job position ${id} was not found`);
    }

    if (before.status === JobCatalogStatus.active) {
      const { _count, ...positionData } = before;
      return { ...positionData, employeeCount: _count.employees };
    }

    const position = await this.prisma.jobPosition.update({
      where: { id },
      data: {
        status: JobCatalogStatus.active,
        archivedAt: null
      },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    });

    await this.writeEmployeeAudit("job_position.restore", "JobPosition", position.id, before, position, actorId);

    const { _count, ...positionData } = position;
    return { ...positionData, employeeCount: _count.employees };
  }

  async deleteJobPosition(id: string, actorId?: string) {
    const position = await this.prisma.jobPosition.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } }
    });

    if (!position) throw new NotFoundException(`Job position ${id} was not found`);
    if (position._count.employees > 0) {
      throw new ConflictException("Job position is still assigned to employees");
    }

    await this.prisma.jobPosition.delete({ where: { id } });
    await this.writeEmployeeAudit("job_position.delete", "JobPosition", id, position, null, actorId);
    return { id, deleted: true };
  }

  async findJobLevels(includeArchived = false) {
    return this.prisma.jobLevel.findMany({
      where: includeArchived ? undefined : { status: JobCatalogStatus.active },
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
    });
  }

  async createJobLevel(dto: CreateJobLevelDto, actorId?: string) {
    try {
      const level = await this.prisma.jobLevel.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          sortOrder: dto.sortOrder ?? 0
        }
      });

      await this.writeEmployeeAudit("job_level.create", "JobLevel", level.id, null, level, actorId);
      return level;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Job level name already exists");
      }

      throw error;
    }
  }

  async deleteJobLevel(id: string, actorId?: string) {
    const level = await this.prisma.jobLevel.findUnique({ where: { id } });
    if (!level) throw new NotFoundException(`Job level ${id} was not found`);

    await this.prisma.jobLevel.delete({ where: { id } });
    await this.writeEmployeeAudit("job_level.delete", "JobLevel", id, level, null, actorId);
    return { id, deleted: true };
  }

  async findWorkplaces(includeArchived = false) {
    return this.prisma.workplace.findMany({
      where: includeArchived ? undefined : { status: JobCatalogStatus.active },
      include: {
        department: {
          select: { id: true, name: true }
        }
      },
      orderBy: [{ status: "asc" }, { name: "asc" }]
    });
  }

  async createWorkplace(dto: CreateWorkplaceDto, actorId?: string) {
    try {
      const workplace = await this.prisma.workplace.create({
        data: {
          name: dto.name,
          addressLine: dto.addressLine ?? null,
          administrativeArea: dto.administrativeArea ?? null,
          departmentId: dto.departmentId ?? null,
          description: dto.description ?? null
        },
        include: {
          department: {
            select: { id: true, name: true }
          }
        }
      });

      await this.writeEmployeeAudit("workplace.create", "Workplace", workplace.id, null, workplace, actorId);
      return workplace;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Workplace name already exists");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new BadRequestException("The selected department does not exist");
      }

      throw error;
    }
  }

  async deleteWorkplace(id: string, actorId?: string) {
    const workplace = await this.prisma.workplace.findUnique({
      where: { id },
      include: { department: { select: { id: true, name: true } } }
    });
    if (!workplace) throw new NotFoundException(`Workplace ${id} was not found`);

    await this.prisma.workplace.delete({ where: { id } });
    await this.writeEmployeeAudit("workplace.delete", "Workplace", id, workplace, null, actorId);
    return { id, deleted: true };
  }

  async findInternalPenalties(includeArchived = false) {
    return this.prisma.internalPenalty.findMany({
      where: includeArchived ? undefined : { status: JobCatalogStatus.active },
      include: {
        createdBy: {
          select: { id: true, fullName: true, avatarUrl: true }
        }
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });
  }

  async createInternalPenalty(dto: CreateInternalPenaltyDto, actorId?: string) {
    const penalty = await this.prisma.internalPenalty.create({
      data: {
        violation: dto.violation,
        amount: dto.amount,
        description: dto.description ?? null,
        createdById: actorId ?? null
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, avatarUrl: true }
        }
      }
    });

    await this.writeEmployeeAudit(
      "internal_penalty.create",
      "InternalPenalty",
      penalty.id,
      null,
      penalty,
      actorId
    );
    return penalty;
  }

  async deleteInternalPenalty(id: string, actorId?: string) {
    const penalty = await this.prisma.internalPenalty.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true, avatarUrl: true }
        }
      }
    });

    if (!penalty) {
      throw new NotFoundException(`Internal penalty ${id} was not found`);
    }

    await this.prisma.internalPenalty.delete({ where: { id } });
    await this.writeEmployeeAudit(
      "internal_penalty.delete",
      "InternalPenalty",
      id,
      penalty,
      null,
      actorId
    );

    return { id, deleted: true };
  }

  async findWelfareBenefits(includeArchived = false) {
    return this.prisma.welfareBenefit.findMany({
      where: includeArchived ? undefined : { status: JobCatalogStatus.active },
      include: {
        createdBy: {
          select: { id: true, fullName: true, avatarUrl: true }
        }
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });
  }

  async createWelfareBenefit(dto: CreateWelfareBenefitDto, actorId?: string) {
    const benefit = await this.prisma.welfareBenefit.create({
      data: {
        name: dto.name,
        amount: dto.amount,
        description: dto.description ?? null,
        createdById: actorId ?? null
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, avatarUrl: true }
        }
      }
    });

    await this.writeEmployeeAudit(
      "welfare_benefit.create",
      "WelfareBenefit",
      benefit.id,
      null,
      benefit,
      actorId
    );
    return benefit;
  }

  async deleteWelfareBenefit(id: string, actorId?: string) {
    const benefit = await this.prisma.welfareBenefit.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true, avatarUrl: true }
        }
      }
    });

    if (!benefit) {
      throw new NotFoundException(`Welfare benefit ${id} was not found`);
    }

    await this.prisma.welfareBenefit.delete({ where: { id } });
    await this.writeEmployeeAudit(
      "welfare_benefit.delete",
      "WelfareBenefit",
      id,
      benefit,
      null,
      actorId
    );

    return { id, deleted: true };
  }

  async findWelfarePackages(includeArchived = false) {
    return this.prisma.welfarePackage.findMany({
      where: includeArchived ? undefined : { status: JobCatalogStatus.active },
      include: {
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        position: { select: { id: true, name: true } },
        jobTitle: { select: { id: true, name: true } },
        jobLevel: { select: { id: true, name: true } },
        items: {
          include: { benefit: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });
  }

  async createWelfarePackage(dto: CreateWelfarePackageDto, actorId?: string) {
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException("End date must not be earlier than start date");
    }

    try {
      const welfarePackage = await this.prisma.welfarePackage.create({
        data: {
          name: dto.name,
          startDate,
          endDate,
          positionId: dto.positionId ?? null,
          jobTitleId: dto.jobTitleId ?? null,
          jobLevelId: dto.jobLevelId ?? null,
          description: dto.description ?? null,
          createdById: actorId ?? null,
          items: {
            create: dto.items.map((item) => ({
              benefitId: item.benefitId ?? null,
              amount: item.amount,
              paymentMethod: item.paymentMethod ?? null
            }))
          }
        },
        include: {
          createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
          position: { select: { id: true, name: true } },
          jobTitle: { select: { id: true, name: true } },
          jobLevel: { select: { id: true, name: true } },
          items: { include: { benefit: { select: { id: true, name: true } } } }
        }
      });

      await this.writeEmployeeAudit(
        "welfare_package.create",
        "WelfarePackage",
        welfarePackage.id,
        null,
        welfarePackage,
        actorId
      );
      return welfarePackage;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new BadRequestException("A selected catalog item does not exist");
      }
      throw error;
    }
  }

  async deleteWelfarePackage(id: string, actorId?: string) {
    const welfarePackage = await this.prisma.welfarePackage.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!welfarePackage) throw new NotFoundException(`Welfare package ${id} was not found`);

    await this.prisma.welfarePackage.delete({ where: { id } });
    await this.writeEmployeeAudit(
      "welfare_package.delete",
      "WelfarePackage",
      id,
      welfarePackage,
      null,
      actorId
    );
    return { id, deleted: true };
  }

  async findJobTitles(includeArchived = false) {
    const titles = await this.prisma.jobTitle.findMany({
      where: includeArchived ? undefined : { status: JobCatalogStatus.active },
      include: {
        level: true,
        _count: {
          select: {
            employees: true
          }
        }
      },
      orderBy: [{ status: "asc" }, { rank: "asc" }, { name: "asc" }]
    });

    return titles.map(({ _count, ...title }) => ({
      ...title,
      employeeCount: _count.employees
    }));
  }

  async createJobTitle(dto: CreateJobTitleDto, actorId?: string) {
    try {
      const title = await this.prisma.jobTitle.create({
        data: {
          code: dto.code,
          name: dto.name,
          rank: dto.rank ?? 0,
          levelId: dto.levelId ?? null,
          description: dto.description ?? null
        },
        include: {
          _count: {
            select: {
              employees: true
            }
          }
        }
      });

      await this.writeEmployeeAudit("job_title.create", "JobTitle", title.id, null, title, actorId);

      const { _count, ...titleData } = title;
      return { ...titleData, employeeCount: _count.employees };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Job title code or name already exists");
      }

      throw error;
    }
  }

  async updateJobTitle(id: string, dto: UpdateJobTitleDto, actorId?: string) {
    const before = await this.prisma.jobTitle.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    });

    if (!before) {
      throw new NotFoundException(`Job title ${id} was not found`);
    }

    if (before.status === JobCatalogStatus.archived) {
      throw new ConflictException("Archived job titles cannot be updated");
    }

    try {
      const title = await this.prisma.jobTitle.update({
        where: { id },
        data: {
          code: dto.code,
          name: dto.name,
          rank: dto.rank,
          levelId: dto.levelId,
          description: dto.description
        },
        include: {
          _count: {
            select: {
              employees: true
            }
          }
        }
      });

      await this.writeEmployeeAudit("job_title.update", "JobTitle", title.id, before, title, actorId);

      const { _count, ...titleData } = title;
      return { ...titleData, employeeCount: _count.employees };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Job title code or name already exists");
      }

      throw error;
    }
  }

  async archiveJobTitle(id: string, actorId?: string) {
    const before = await this.prisma.jobTitle.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    });

    if (!before) {
      throw new NotFoundException(`Job title ${id} was not found`);
    }

    if (before.status === JobCatalogStatus.archived) {
      const { _count, ...titleData } = before;
      return { ...titleData, employeeCount: _count.employees };
    }

    if (before._count.employees > 0) {
      throw new ConflictException("Move employees out of this job title before archiving it");
    }

    const title = await this.prisma.jobTitle.update({
      where: { id },
      data: {
        status: JobCatalogStatus.archived,
        archivedAt: new Date()
      },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    });

    await this.writeEmployeeAudit("job_title.archive", "JobTitle", title.id, before, title, actorId);

    const { _count, ...titleData } = title;
    return { ...titleData, employeeCount: _count.employees };
  }

  async restoreJobTitle(id: string, actorId?: string) {
    const before = await this.prisma.jobTitle.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    });

    if (!before) {
      throw new NotFoundException(`Job title ${id} was not found`);
    }

    if (before.status === JobCatalogStatus.active) {
      const { _count, ...titleData } = before;
      return { ...titleData, employeeCount: _count.employees };
    }

    const title = await this.prisma.jobTitle.update({
      where: { id },
      data: {
        status: JobCatalogStatus.active,
        archivedAt: null
      },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    });

    await this.writeEmployeeAudit("job_title.restore", "JobTitle", title.id, before, title, actorId);

    const { _count, ...titleData } = title;
    return { ...titleData, employeeCount: _count.employees };
  }

  async deleteJobTitle(id: string, actorId?: string) {
    const title = await this.prisma.jobTitle.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } }
    });

    if (!title) throw new NotFoundException(`Job title ${id} was not found`);
    if (title._count.employees > 0) {
      throw new ConflictException("Job title is still assigned to employees");
    }

    await this.prisma.jobTitle.delete({ where: { id } });
    await this.writeEmployeeAudit("job_title.delete", "JobTitle", id, title, null, actorId);
    return { id, deleted: true };
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
      where: { status: DepartmentStatus.active },
      include: {
        employees: {
          include: employeeInclude,
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
      include: employeeInclude
    });
    const headsById = new Map(heads.map((employee) => [employee.id, this.resolveEmployee(employee)]));

    return departments.map((department) => ({
      ...department,
      headcount: department._count.employees,
      status: department.status,
      archivedAt: department.archivedAt,
      head: department.headId ? headsById.get(department.headId) ?? null : null,
      members: department.employees.map((employee) => this.resolveEmployee(employee))
    }));
  }

  private async resolveEmployeeJobCatalog(dto: CreateEmployeeDto) {
    const [position, jobTitle] = await Promise.all([
      dto.positionId
        ? this.prisma.jobPosition.findUnique({
            where: { id: dto.positionId },
            select: {
              id: true,
              name: true,
              status: true
            }
          })
        : null,
      dto.jobTitleId
        ? this.prisma.jobTitle.findUnique({
            where: { id: dto.jobTitleId },
            select: {
              id: true,
              name: true,
              status: true
            }
          })
        : null
    ]);

    if (dto.positionId && !position) {
      throw new NotFoundException(`Job position ${dto.positionId} was not found`);
    }

    if (dto.jobTitleId && !jobTitle) {
      throw new NotFoundException(`Job title ${dto.jobTitleId} was not found`);
    }

    if (position?.status === JobCatalogStatus.archived) {
      throw new ConflictException("Archived positions cannot be assigned to employees");
    }

    if (jobTitle?.status === JobCatalogStatus.archived) {
      throw new ConflictException("Archived job titles cannot be assigned to employees");
    }

    const explicitTitle = dto.title?.trim();
    const generatedTitle = [position?.name, jobTitle?.name].filter(Boolean).join(" - ");
    const displayTitle = explicitTitle || generatedTitle;

    if (!displayTitle) {
      throw new BadRequestException("Employee title or job catalog selection is required");
    }

    return {
      displayTitle,
      positionId: position?.id ?? null,
      jobTitleId: jobTitle?.id ?? null
    };
  }

  private async resolveEmployeeJobCatalogForUpdate(before: EmployeeWithDepartment, dto: UpdateEmployeeDto) {
    const nextPositionId = dto.positionId === undefined ? before.positionId : dto.positionId;
    const nextJobTitleId = dto.jobTitleId === undefined ? before.jobTitleId : dto.jobTitleId;
    const [position, jobTitle] = await Promise.all([
      nextPositionId
        ? this.prisma.jobPosition.findUnique({
            where: { id: nextPositionId },
            select: {
              id: true,
              name: true,
              status: true
            }
          })
        : null,
      nextJobTitleId
        ? this.prisma.jobTitle.findUnique({
            where: { id: nextJobTitleId },
            select: {
              id: true,
              name: true,
              status: true
            }
          })
        : null
    ]);

    if (nextPositionId && !position) {
      throw new NotFoundException(`Job position ${nextPositionId} was not found`);
    }

    if (nextJobTitleId && !jobTitle) {
      throw new NotFoundException(`Job title ${nextJobTitleId} was not found`);
    }

    if (position?.status === JobCatalogStatus.archived) {
      throw new ConflictException("Archived positions cannot be assigned to employees");
    }

    if (jobTitle?.status === JobCatalogStatus.archived) {
      throw new ConflictException("Archived job titles cannot be assigned to employees");
    }

    const explicitTitle = dto.title?.trim();
    const generatedTitle = [position?.name, jobTitle?.name].filter(Boolean).join(" - ");
    const displayTitle = explicitTitle || generatedTitle || before.title;

    if (!displayTitle) {
      throw new BadRequestException("Employee title or job catalog selection is required");
    }

    return {
      displayTitle,
      positionId: position?.id ?? null,
      jobTitleId: jobTitle?.id ?? null
    };
  }

  private async assertEmployeeDepartment(departmentId: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: {
        id: true,
        status: true
      }
    });

    if (!department) {
      throw new NotFoundException(`Department ${departmentId} was not found`);
    }

    if (department.status === DepartmentStatus.archived) {
      throw new ConflictException("Archived departments cannot be assigned to employees");
    }
  }

  private async assertEmployeeManager(managerId: string | null | undefined, currentEmployeeId?: string) {
    if (managerId === undefined || managerId === null) {
      return;
    }

    if (currentEmployeeId && managerId === currentEmployeeId) {
      throw new ConflictException("An employee cannot be their own manager");
    }

    const manager = await this.prisma.employee.findUnique({
      where: { id: managerId },
      select: {
        id: true,
        managerId: true,
        status: true
      }
    });

    if (!manager) {
      throw new NotFoundException(`Manager ${managerId} was not found`);
    }

    if (manager.status !== "active") {
      throw new ConflictException("Only active employees can be assigned as direct manager");
    }

    if (!currentEmployeeId) {
      return;
    }

    let nextManagerId = manager.managerId;

    while (nextManagerId) {
      if (nextManagerId === currentEmployeeId) {
        throw new ConflictException("Manager assignment would create a reporting cycle");
      }

      const nextManager = await this.prisma.employee.findUnique({
        where: { id: nextManagerId },
        select: {
          managerId: true
        }
      });

      nextManagerId = nextManager?.managerId ?? null;
    }
  }

  private async resolveDepartment(department: DepartmentWithCounts) {
    const head = department.headId
      ? await this.prisma.employee.findUnique({
          where: { id: department.headId },
          select: {
            id: true,
            code: true,
            fullName: true,
            title: true
          }
        })
      : null;

    const { _count, ...departmentData } = department;

    return {
      ...departmentData,
      parentName: department.parent?.name ?? null,
      head: head
        ? {
            id: head.id,
            code: head.code,
            name: head.fullName,
            title: head.title
          }
        : null,
      headcount: _count.employees,
      childCount: _count.children
    };
  }

  private async generateDepartmentCode() {
    const departments = await this.prisma.department.findMany({
      select: {
        code: true
      },
      where: {
        code: {
          startsWith: "DEP-"
        }
      }
    });
    const maxCodeNumber = departments.reduce((max, department) => {
      const match = /^DEP-(\d+)$/i.exec(department.code);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    return `DEP-${String(maxCodeNumber + 1).padStart(3, "0")}`;
  }

  private isUniqueConstraintError(error: unknown, field?: string) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      return false;
    }

    if (!field) {
      return true;
    }

    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.includes(field);
    }

    return typeof target === "string" ? target.includes(field) : false;
  }

  private async assertDepartmentParent(parentId: string | null | undefined, currentDepartmentId?: string) {
    if (parentId === undefined || parentId === null) {
      return;
    }

    if (currentDepartmentId && parentId === currentDepartmentId) {
      throw new ConflictException("A department cannot be its own parent");
    }

    const parent = await this.prisma.department.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        status: true
      }
    });

    if (!parent) {
      throw new NotFoundException(`Parent department ${parentId} was not found`);
    }

    if (parent.status === DepartmentStatus.archived) {
      throw new ConflictException("Archived departments cannot be used as parent departments");
    }

    if (currentDepartmentId && (await this.isDepartmentDescendant(parentId, currentDepartmentId))) {
      throw new ConflictException("A department cannot be moved under one of its child departments");
    }
  }

  private async isDepartmentDescendant(candidateId: string, ancestorId: string) {
    let current = await this.prisma.department.findUnique({
      where: { id: candidateId },
      select: {
        parentId: true
      }
    });

    while (current?.parentId) {
      if (current.parentId === ancestorId) {
        return true;
      }

      current = await this.prisma.department.findUnique({
        where: { id: current.parentId },
        select: {
          parentId: true
        }
      });
    }

    return false;
  }

  private async assertDepartmentHead(headId: string | null | undefined) {
    if (headId === undefined || headId === null) {
      return;
    }

    const head = await this.prisma.employee.findUnique({
      where: { id: headId },
      select: {
        id: true,
        status: true
      }
    });

    if (!head) {
      throw new NotFoundException(`Department head ${headId} was not found`);
    }

    if (head.status !== "active") {
      throw new ConflictException("Only active employees can be assigned as department head");
    }
  }

  private async writeEmployeeAudit(
    action: string,
    entityType: string,
    entityId: string,
    beforeValue: unknown,
    afterValue: unknown,
    actorId?: string
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        beforeValue: beforeValue === null ? undefined : this.toAuditJson(beforeValue),
        afterValue: afterValue === null ? undefined : this.toAuditJson(afterValue)
      }
    });
  }

  private resolveEmployee(employee: EmployeeWithDepartment) {
    return {
      ...employee,
      name: employee.fullName,
      department: employee.department.name,
      departmentCode: employee.department.code,
      positionName: employee.position?.name ?? null,
      jobTitleName: employee.jobTitle?.name ?? null,
      managerName: employee.manager?.fullName ?? null,
      managerCode: employee.manager?.code ?? null,
      accountId: employee.userAccount?.id ?? null,
      accountEmail: employee.userAccount?.email ?? null,
      accountStatus: employee.userAccount?.accountStatus ?? null,
      accountDisplayName: employee.userAccount?.displayName ?? null,
      accountRole: employee.userAccount?.adminRole ?? null,
      accountCreatedAt: employee.userAccount?.createdAt ?? null,
      permissionGroupId: employee.userAccount?.permissionGroupId ?? null,
      currentContract: employee.contracts[0] ?? null
    };
  }

  private toAuditJson(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private async provisionAccountIdentity(dto: CreateEmployeeDto) {
    if (!dto.account?.email) {
      throw new BadRequestException("Account email is required when createAccount is enabled");
    }

    const accountStatus = dto.account.accountStatus ?? AccountLifecycleStatus.pending_activation;
    const adminRole = dto.account.adminRole ?? "user";
    const requirePasswordChange = dto.account.requirePasswordChange ?? true;

    return this.keycloakAdmin.provisionUser({
      email: dto.account.email,
      displayName: dto.fullName,
      enabled: accountStatus === AccountLifecycleStatus.active,
      initialPassword: dto.account.initialPassword,
      temporaryPassword: Boolean(dto.account.initialPassword && requirePasswordChange),
      requiredActions: requirePasswordChange ? ["UPDATE_PASSWORD"] : [],
      roles: [adminRole],
      username: dto.account.username ?? dto.account.email
    });
  }

  private async deliverInviteIfReady(accountId: string, actorId?: string) {
    const account = await this.prisma.userAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        keycloakUserId: true,
        email: true,
        accountStatus: true,
        passwordResetRequired: true,
        inviteEmailRequested: true,
        inviteSentAt: true
      }
    });

    if (!account || !account.inviteEmailRequested || account.inviteSentAt) {
      return;
    }

    if (account.accountStatus !== AccountLifecycleStatus.active) {
      await this.writeSystemAudit("account.invite.deferred", "UserAccount", account.id, null, {
        email: account.email,
        reason: "account_not_active",
        accountStatus: account.accountStatus
      }, actorId);
      return;
    }

    if (!account.passwordResetRequired) {
      await this.writeSystemAudit("account.invite.skipped", "UserAccount", account.id, null, {
        email: account.email,
        reason: "no_required_actions"
      }, actorId);
      return;
    }

    if (!(await this.isInviteEmailEnabled())) {
      await this.writeSystemAudit("account.invite.skipped", "UserAccount", account.id, null, {
        email: account.email,
        reason: "invite_email_disabled"
      }, actorId);
      return;
    }

    try {
      await this.keycloakAdmin.sendRequiredActionsEmail(account.keycloakUserId, ["UPDATE_PASSWORD"]);
      const updated = await this.prisma.userAccount.update({
        where: { id: account.id },
        data: {
          inviteSentAt: new Date()
        }
      });

      await this.writeSystemAudit("account.invite.sent", "UserAccount", account.id, account, updated, actorId);
    } catch (error) {
      await this.writeSystemAudit("account.invite.failed", "UserAccount", account.id, null, {
        email: account.email,
        reason: error instanceof Error ? error.message.slice(0, 300) : "unknown_error"
      }, actorId);
    }
  }

  private async writeSystemAudit(
    action: string,
    entityType: string,
    entityId: string,
    beforeValue: unknown,
    afterValue: unknown,
    actorId?: string
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        beforeValue: beforeValue === null ? undefined : this.toAuditJson(beforeValue),
        afterValue: this.toAuditJson(afterValue)
      }
    });
  }

  private async isInviteEmailEnabled() {
    if (this.config.get<string>("ACCOUNT_INVITE_EMAIL_ENABLED") === "true") {
      return true;
    }

    return this.adminSettings.isSmtpEmailEnabled();
  }
}
