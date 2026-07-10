import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import {
  AccountAdminRole,
  AccountLifecycleStatus,
  ApprovalStatus,
  AttendanceStatus,
  EmployeeStatus,
  LicensePlan,
  PayrollStatus,
  PrismaClient
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  attendanceRecords,
  contracts,
  departments,
  employees,
  leaveRequests,
  payrollCycles,
  permissionGroups,
  userAccounts
} from "../src/common/mock-data";

for (const envPath of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  loadEnv({ path: envPath, quiet: true });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://helios:helios@localhost:5432/helios_office?schema=public";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl })
});

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function toWorkDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateTime(dateValue: string, timeValue: string | null | undefined) {
  return timeValue ? new Date(`${dateValue}T${timeValue}:00.000Z`) : null;
}

function normalizeApprovalStatus(status: string) {
  if (status === "approved") {
    return ApprovalStatus.approved;
  }

  if (status === "rejected") {
    return ApprovalStatus.rejected;
  }

  if (status === "cancelled") {
    return ApprovalStatus.cancelled;
  }

  if (status === "draft") {
    return ApprovalStatus.draft;
  }

  return ApprovalStatus.pending;
}

function normalizeAdminRole(value: string) {
  return value === "system_admin" ? AccountAdminRole.system_admin : AccountAdminRole.user;
}

function normalizeLicensePlan(value: string) {
  if (value === "enterprise") {
    return LicensePlan.enterprise;
  }

  if (value === "professional") {
    return LicensePlan.professional;
  }

  return LicensePlan.standard;
}

function normalizeAccountStatus(value: string) {
  if (value === "active") {
    return AccountLifecycleStatus.active;
  }

  if (value === "closed") {
    return AccountLifecycleStatus.closed;
  }

  return AccountLifecycleStatus.pending_activation;
}

function normalizeEmployeeStatus(value: string) {
  if (value === "onboarding") {
    return EmployeeStatus.onboarding;
  }

  if (value === "offboarding") {
    return EmployeeStatus.offboarding;
  }

  if (value === "resigned") {
    return EmployeeStatus.resigned;
  }

  return EmployeeStatus.active;
}

function normalizeAttendanceStatus(value: string) {
  if (value === "late") {
    return AttendanceStatus.late;
  }

  if (value === "early_leave") {
    return AttendanceStatus.early_leave;
  }

  if (value === "missing_checkout") {
    return AttendanceStatus.missing_checkout;
  }

  if (value === "needs_review") {
    return AttendanceStatus.needs_review;
  }

  return AttendanceStatus.valid;
}

function normalizePayrollStatus(value: string) {
  if (value === "reviewing") {
    return PayrollStatus.reviewing;
  }

  if (value === "approved") {
    return PayrollStatus.approved;
  }

  if (value === "published") {
    return PayrollStatus.published;
  }

  if (value === "locked") {
    return PayrollStatus.locked;
  }

  return PayrollStatus.draft;
}

function payrollPeriodFromId(id: string) {
  const match = id.match(/(\d{4})-(\d{2})$/);
  const year = match ? Number(match[1]) : new Date().getUTCFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : new Date().getUTCMonth();
  const periodStart = new Date(Date.UTC(year, monthIndex, 1));
  const periodEnd = new Date(Date.UTC(year, monthIndex + 1, 0));

  return { periodStart, periodEnd };
}

async function seedPermissionGroups() {
  for (const group of permissionGroups) {
    await prisma.permissionGroup.upsert({
      where: { id: group.id },
      update: {
        name: group.name,
        description: group.description,
        roleScope: normalizeAdminRole(group.roleScope),
        licensePlan: normalizeLicensePlan(group.licensePlan),
        permissions: group.permissionKeys
      },
      create: {
        id: group.id,
        name: group.name,
        description: group.description,
        roleScope: normalizeAdminRole(group.roleScope),
        licensePlan: normalizeLicensePlan(group.licensePlan),
        permissions: group.permissionKeys
      }
    });
  }
}

async function seedDepartments() {
  for (const department of departments) {
    await prisma.department.upsert({
      where: { id: department.id },
      update: {
        name: department.name,
        parentId: department.parentId,
        headId: department.headId
      },
      create: {
        id: department.id,
        name: department.name,
        parentId: department.parentId,
        headId: department.headId
      }
    });
  }
}

async function seedUserAccounts() {
  for (const account of userAccounts) {
    await prisma.userAccount.upsert({
      where: { id: account.id },
      update: {
        keycloakUserId: `local-${account.id}`,
        email: account.email,
        displayName: account.displayName,
        roles: [account.role],
        adminRole: normalizeAdminRole(account.role),
        licensePlan: normalizeLicensePlan(account.licensePlan),
        accountStatus: normalizeAccountStatus(account.status),
        permissionGroupId: account.permissionGroupId,
        customPermissionsEnabled: account.customPermissionsEnabled,
        customPermissions: account.customPermissionKeys,
        customPermissionNote: account.customPermissionNote,
        activatedAt: toDate(account.activatedAt),
        closedAt: toDate(account.closedAt)
      },
      create: {
        id: account.id,
        keycloakUserId: `local-${account.id}`,
        email: account.email,
        displayName: account.displayName,
        roles: [account.role],
        adminRole: normalizeAdminRole(account.role),
        licensePlan: normalizeLicensePlan(account.licensePlan),
        accountStatus: normalizeAccountStatus(account.status),
        permissionGroupId: account.permissionGroupId,
        customPermissionsEnabled: account.customPermissionsEnabled,
        customPermissions: account.customPermissionKeys,
        customPermissionNote: account.customPermissionNote,
        activatedAt: toDate(account.activatedAt),
        closedAt: toDate(account.closedAt)
      }
    });
  }
}

async function seedEmployees() {
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const departmentByName = new Map(departments.map((department) => [department.name, department]));
  const accountByEmployeeId = new Map(
    userAccounts
      .filter((account) => account.employeeId)
      .map((account) => [account.employeeId, account])
  );

  for (const employee of employees) {
    const department = departmentByName.get(employee.department);
    const account = accountByEmployeeId.get(employee.id);

    if (!department) {
      throw new Error(`Missing department ${employee.department} for employee ${employee.id}`);
    }

    await prisma.employee.upsert({
      where: { id: employee.id },
      update: {
        code: employee.code,
        fullName: employee.name,
        title: employee.title,
        status: normalizeEmployeeStatus(employee.status),
        startDate: toWorkDate(employee.startDate),
        userAccountId: account?.id ?? null,
        departmentId: department.id,
        managerId: employee.managerId && employeeIds.has(employee.managerId) ? employee.managerId : null
      },
      create: {
        id: employee.id,
        code: employee.code,
        fullName: employee.name,
        title: employee.title,
        status: normalizeEmployeeStatus(employee.status),
        startDate: toWorkDate(employee.startDate),
        userAccountId: account?.id ?? null,
        departmentId: department.id,
        managerId: employee.managerId && employeeIds.has(employee.managerId) ? employee.managerId : null
      }
    });
  }
}

async function seedContracts() {
  for (const contract of contracts) {
    await prisma.contract.upsert({
      where: { id: contract.id },
      update: {
        employeeId: contract.employeeId,
        type: contract.type,
        startDate: toWorkDate(contract.startDate),
        endDate: toDate(contract.endDate),
        status: contract.status
      },
      create: {
        id: contract.id,
        employeeId: contract.employeeId,
        type: contract.type,
        startDate: toWorkDate(contract.startDate),
        endDate: toDate(contract.endDate),
        status: contract.status
      }
    });
  }
}

async function seedLeaveRequests() {
  for (const request of leaveRequests) {
    await prisma.leaveRequest.upsert({
      where: { id: request.id },
      update: {
        employeeId: request.employeeId,
        type: request.type,
        fromDate: toWorkDate(request.fromDate),
        toDate: toWorkDate(request.toDate),
        totalDays: request.totalDays,
        status: normalizeApprovalStatus(request.status)
      },
      create: {
        id: request.id,
        employeeId: request.employeeId,
        type: request.type,
        fromDate: toWorkDate(request.fromDate),
        toDate: toWorkDate(request.toDate),
        totalDays: request.totalDays,
        status: normalizeApprovalStatus(request.status)
      }
    });
  }
}

async function seedAttendance() {
  for (const record of attendanceRecords) {
    await prisma.attendanceRecord.upsert({
      where: { id: record.id },
      update: {
        employeeId: record.employeeId,
        workDate: toWorkDate(record.workDate),
        checkIn: toDateTime(record.workDate, record.checkIn),
        checkOut: toDateTime(record.workDate, record.checkOut),
        source: "machine",
        status: normalizeAttendanceStatus(record.status)
      },
      create: {
        id: record.id,
        employeeId: record.employeeId,
        workDate: toWorkDate(record.workDate),
        checkIn: toDateTime(record.workDate, record.checkIn),
        checkOut: toDateTime(record.workDate, record.checkOut),
        source: "machine",
        status: normalizeAttendanceStatus(record.status)
      }
    });
  }
}

async function seedPayroll() {
  for (const cycle of payrollCycles) {
    const { periodStart, periodEnd } = payrollPeriodFromId(cycle.id);

    await prisma.payrollCycle.upsert({
      where: { id: cycle.id },
      update: {
        name: cycle.name,
        periodStart,
        periodEnd,
        status: normalizePayrollStatus(cycle.status),
        lockedAttendanceAt: toDate(cycle.lockedAttendanceAt)
      },
      create: {
        id: cycle.id,
        name: cycle.name,
        periodStart,
        periodEnd,
        status: normalizePayrollStatus(cycle.status),
        lockedAttendanceAt: toDate(cycle.lockedAttendanceAt)
      }
    });
  }

  await prisma.payrollItem.upsert({
    where: {
      payrollCycleId_employeeId: {
        payrollCycleId: "pay-2026-06",
        employeeId: "emp-001"
      }
    },
    update: {
      grossAmount: 12500000,
      netAmount: 11576500,
      payload: {
        baseSalary: 10000000,
        allowances: 1500000,
        lunch: 625000,
        deductions: 548500
      }
    },
    create: {
      id: "pay-item-2026-06-emp-001",
      payrollCycleId: "pay-2026-06",
      employeeId: "emp-001",
      grossAmount: 12500000,
      netAmount: 11576500,
      payload: {
        baseSalary: 10000000,
        allowances: 1500000,
        lunch: 625000,
        deductions: 548500
      }
    }
  });
}

async function main() {
  await seedPermissionGroups();
  await seedDepartments();
  await seedUserAccounts();
  await seedEmployees();
  await seedContracts();
  await seedLeaveRequests();
  await seedAttendance();
  await seedPayroll();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
