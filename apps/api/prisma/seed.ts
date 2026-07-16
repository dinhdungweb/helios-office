import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import {
  AccountAdminRole,
  AccountLifecycleStatus,
  ApprovalStatus,
  AttendanceStatus,
  DeviceAuthStatus,
  EmployeeStatus,
  PayrollStatus,
  PrismaClient
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  accountPermissionCatalog,
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

const stagingDepartmentId = "seed-department-staging";
const companyDepartmentId = "org-company-srg";

const deviceAuthPolicySeed = {
  id: "default",
  maxDevicesPerUser: 1,
  requireNotificationEnabled: true,
  requireGpsForAttendance: true,
  requireWifiForOffice: true,
  approvalRefreshHint: "Sau khi được xác thực, nhân viên nên đăng xuất và đăng nhập lại App hoặc tải lại trang GPS."
};

const jobPositionsSeed = [
  {
    id: "pos-software-engineer",
    code: "POS-SWE",
    name: "Ky su phan mem",
    family: "Technology",
    description: "Phat trien, bao tri va toi uu san pham phan mem noi bo."
  },
  {
    id: "pos-hr-executive",
    code: "POS-HR",
    name: "HR Executive",
    family: "People Operations",
    description: "Quan ly ho so nhan su, hop dong, cham cong va nghiep vu HRM."
  },
  {
    id: "pos-sales-specialist",
    code: "POS-SALES",
    name: "Sales Specialist",
    family: "Sales",
    description: "Cham soc khach hang, quan ly pipeline va phoi hop xu ly hop dong."
  },
  {
    id: "pos-operations-coordinator",
    code: "POS-OPS",
    name: "Operations Coordinator",
    family: "Operations",
    description: "Dieu phoi van hanh, theo doi tai san va cap nhat bao cao."
  }
];

const jobTitlesSeed = [
  {
    id: "title-staff",
    code: "TTL-STF",
    name: "Nhan vien",
    rank: 10,
    description: "Cap bac nhan su thong thuong."
  },
  {
    id: "title-team-lead",
    code: "TTL-LEAD",
    name: "Truong nhom",
    rank: 40,
    description: "Dieu phoi nhom nho va co the la buoc duyet trung gian."
  },
  {
    id: "title-manager",
    code: "TTL-MGR",
    name: "Truong phong",
    rank: 70,
    description: "Quan ly phong ban va phe duyet nghiep vu trong bo phan."
  },
  {
    id: "title-director",
    code: "TTL-DIR",
    name: "Giam doc",
    rank: 100,
    description: "Cap quan tri cao nhat trong luong phe duyet nghiep vu."
  }
];

const employeeJobCatalogByTitle = new Map([
  ["Web Lead", { positionId: "pos-software-engineer", jobTitleId: "title-team-lead" }],
  ["HR Executive", { positionId: "pos-hr-executive", jobTitleId: "title-staff" }],
  ["Sales Specialist", { positionId: "pos-sales-specialist", jobTitleId: "title-staff" }],
  ["Operations Coordinator", { positionId: "pos-operations-coordinator", jobTitleId: "title-staff" }],
  ["Sales Manager", { positionId: "pos-sales-specialist", jobTitleId: "title-manager" }]
]);

const deviceAuthRequestsSeed = [
  {
    id: "dev-001",
    employeeCode: "HL-002",
    employeeName: "Nguyễn Hải Anh",
    avatar: "HA",
    department: "People Operations",
    branch: "Hà Nội",
    deviceName: "iPhone 15 Pro Max",
    deviceId: "ios-A7F9-42B1-9C03-HA",
    submittedAt: "10:15 10/07/2026",
    status: "pending",
    note: "Thiết bị mới sau khi đổi máy."
  },
  {
    id: "dev-002",
    employeeCode: "HL-024",
    employeeName: "Hoàng Đức",
    avatar: "HD",
    department: "Sales",
    branch: "Hà Nội",
    deviceName: "Samsung Galaxy S24",
    deviceId: "and-8821-BC77-41AA-HD",
    submittedAt: "09:42 10/07/2026",
    status: "pending"
  },
  {
    id: "dev-003",
    employeeCode: "HL-003",
    employeeName: "Lê Minh Khang",
    avatar: "LK",
    department: "Sales",
    branch: "Hồ Chí Minh",
    deviceName: "OPPO Reno11",
    deviceId: "and-19EF-7742-93AC-LK",
    submittedAt: "17:30 09/07/2026",
    status: "approved",
    lastUsedAt: "08:02 10/07/2026"
  },
  {
    id: "dev-004",
    employeeCode: "HL-019",
    employeeName: "Mai Linh",
    avatar: "ML",
    department: "Operations",
    branch: "Kho trung tâm",
    deviceName: "Xiaomi 14T",
    deviceId: "and-A901-73DD-20FF-ML",
    submittedAt: "14:20 08/07/2026",
    status: "rejected",
    note: "Device ID trùng yêu cầu đã bị từ chối trước đó."
  },
  {
    id: "dev-005",
    employeeCode: "HL-001",
    employeeName: "Đặng Đình Dũng",
    avatar: "DD",
    department: "Helios",
    branch: "Hà Nội",
    deviceName: "iPhone 14 Pro",
    deviceId: "ios-F301-112A-770C-DD",
    submittedAt: "08:45 02/07/2026",
    status: "locked",
    lastUsedAt: "18:05 08/07/2026",
    note: "Khóa tạm thời theo yêu cầu bảo mật."
  }
];

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function toWorkDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateTime(dateValue: string, timeValue: string | null | undefined) {
  return timeValue ? new Date(`${dateValue}T${timeValue}:00.000Z`) : null;
}

function toDeviceDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{2}):(\d{2}) (\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return new Date(value);
  }

  const [, hour, minute, day, month, year] = match;

  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 7, Number(minute)));
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

function payrollTemplateForDepartment(departmentName: string) {
  if (departmentName === "Sales" || departmentName.includes("Kinh doanh")) {
    return "sales";
  }

  if (departmentName === "Operations" || departmentName.includes("Kho vận")) {
    return "operations";
  }

  return "office-standard";
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

function normalizeDeviceAuthStatus(value: string) {
  if (value === "approved") {
    return DeviceAuthStatus.approved;
  }

  if (value === "rejected") {
    return DeviceAuthStatus.rejected;
  }

  if (value === "locked") {
    return DeviceAuthStatus.locked;
  }

  return DeviceAuthStatus.pending;
}

function payrollPeriodFromId(id: string) {
  const match = id.match(/(\d{4})-(\d{2})$/);
  const year = match ? Number(match[1]) : new Date().getUTCFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : new Date().getUTCMonth();
  const periodStart = new Date(Date.UTC(year, monthIndex, 1));
  const periodEnd = new Date(Date.UTC(year, monthIndex + 1, 0));

  return { periodStart, periodEnd };
}

async function seedPermissionDefinitions() {
  for (const [index, permission] of accountPermissionCatalog.entries()) {
    await prisma.permissionDefinition.upsert({
      where: { key: permission.key },
      update: {
        category: permission.category,
        label: permission.label,
        adminOnly: permission.adminOnly,
        sortOrder: index + 1
      },
      create: {
        key: permission.key,
        category: permission.category,
        label: permission.label,
        adminOnly: permission.adminOnly,
        sortOrder: index + 1
      }
    });
  }
}

function seedPermissionKeys(permissionKeys: string[], sourceName: string) {
  const catalogKeys = new Set(accountPermissionCatalog.map((permission) => permission.key));
  const unknownKeys = permissionKeys.filter((permissionKey) => !catalogKeys.has(permissionKey));

  if (unknownKeys.length > 0) {
    throw new Error(`Unknown permission keys in ${sourceName}: ${unknownKeys.join(", ")}`);
  }

  return permissionKeys;
}

async function seedPermissionGroups() {
  for (const group of permissionGroups) {
    await prisma.permissionGroup.upsert({
      where: { id: group.id },
      update: {
        name: group.name,
        description: group.description,
        roleScope: normalizeAdminRole(group.roleScope),
        permissions: seedPermissionKeys(group.permissionKeys, group.id)
      },
      create: {
        id: group.id,
        name: group.name,
        description: group.description,
        roleScope: normalizeAdminRole(group.roleScope),
        permissions: seedPermissionKeys(group.permissionKeys, group.id)
      }
    });
  }
}

async function seedDepartments() {
  for (const department of departments) {
    await prisma.department.upsert({
      where: { id: department.id },
      update: {
        code: department.code,
        name: department.name,
        parentId: department.parentId,
        headId: department.headId,
        permissionStructure: department.permissionStructure,
        departmentType: department.departmentType,
        businessUnit: department.businessUnit,
        description: department.description,
        isManagementUnit: department.isManagementUnit,
        status: "active",
        archivedAt: null
      },
      create: {
        id: department.id,
        code: department.code,
        name: department.name,
        parentId: department.parentId,
        headId: department.headId,
        permissionStructure: department.permissionStructure,
        departmentType: department.departmentType,
        businessUnit: department.businessUnit,
        description: department.description,
        isManagementUnit: department.isManagementUnit,
        status: "active"
      }
    });
  }
}

async function prepareDepartmentTreeReset() {
  await prisma.department.upsert({
    where: { id: stagingDepartmentId },
    update: {
      code: "SEED-STAGING",
      name: "Seed Department Staging",
      parentId: null,
      headId: null,
      permissionStructure: "department",
      departmentType: "department",
      businessUnit: null,
      description: "Temporary department used while rebuilding seeded organization data.",
      isManagementUnit: false,
      status: "active",
      archivedAt: null
    },
    create: {
      id: stagingDepartmentId,
      code: "SEED-STAGING",
      name: "Seed Department Staging",
      permissionStructure: "department",
      departmentType: "department",
      description: "Temporary department used while rebuilding seeded organization data."
    }
  });

  await prisma.employee.updateMany({
    data: { departmentId: stagingDepartmentId }
  });

  await prisma.department.deleteMany({
    where: { id: { not: stagingDepartmentId } }
  });
}

async function finishDepartmentTreeReset() {
  await prisma.employee.updateMany({
    where: { departmentId: stagingDepartmentId },
    data: { departmentId: companyDepartmentId }
  });

  await prisma.department.delete({
    where: { id: stagingDepartmentId }
  });
}

async function seedJobCatalog() {
  for (const position of jobPositionsSeed) {
    await prisma.jobPosition.upsert({
      where: { id: position.id },
      update: {
        code: position.code,
        name: position.name,
        family: position.family,
        description: position.description,
        status: "active",
        archivedAt: null
      },
      create: {
        id: position.id,
        code: position.code,
        name: position.name,
        family: position.family,
        description: position.description,
        status: "active"
      }
    });
  }

  for (const title of jobTitlesSeed) {
    await prisma.jobTitle.upsert({
      where: { id: title.id },
      update: {
        code: title.code,
        name: title.name,
        rank: title.rank,
        description: title.description,
        status: "active",
        archivedAt: null
      },
      create: {
        id: title.id,
        code: title.code,
        name: title.name,
        rank: title.rank,
        description: title.description,
        status: "active"
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
        accountStatus: normalizeAccountStatus(account.status),
        permissionGroupId: account.permissionGroupId,
        customPermissionsEnabled: account.customPermissionsEnabled,
        customPermissions: seedPermissionKeys(account.customPermissionKeys, account.id),
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
        accountStatus: normalizeAccountStatus(account.status),
        permissionGroupId: account.permissionGroupId,
        customPermissionsEnabled: account.customPermissionsEnabled,
        customPermissions: seedPermissionKeys(account.customPermissionKeys, account.id),
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
    const jobCatalog = employeeJobCatalogByTitle.get(employee.title);

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
        employeeType: "official",
        attendanceCode: employee.code,
        attendanceMode: "app_and_device",
        payrollTemplate: payrollTemplateForDepartment(employee.department),
        standardWorkdays: 26,
        userAccountId: account?.id ?? null,
        departmentId: department.id,
        positionId: jobCatalog?.positionId ?? null,
        jobTitleId: jobCatalog?.jobTitleId ?? null,
        managerId: employee.managerId && employeeIds.has(employee.managerId) ? employee.managerId : null
      },
      create: {
        id: employee.id,
        code: employee.code,
        fullName: employee.name,
        title: employee.title,
        status: normalizeEmployeeStatus(employee.status),
        startDate: toWorkDate(employee.startDate),
        employeeType: "official",
        attendanceCode: employee.code,
        attendanceMode: "app_and_device",
        payrollTemplate: payrollTemplateForDepartment(employee.department),
        standardWorkdays: 26,
        userAccountId: account?.id ?? null,
        departmentId: department.id,
        positionId: jobCatalog?.positionId ?? null,
        jobTitleId: jobCatalog?.jobTitleId ?? null,
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

async function seedDeviceAuth() {
  const employeesByCode = new Map(
    (await prisma.employee.findMany({
      select: {
        id: true,
        code: true
      }
    })).map((employee) => [employee.code, employee.id])
  );

  await prisma.deviceAuthPolicy.upsert({
    where: { id: deviceAuthPolicySeed.id },
    update: {
      maxDevicesPerUser: deviceAuthPolicySeed.maxDevicesPerUser,
      requireNotificationEnabled: deviceAuthPolicySeed.requireNotificationEnabled,
      requireGpsForAttendance: deviceAuthPolicySeed.requireGpsForAttendance,
      requireWifiForOffice: deviceAuthPolicySeed.requireWifiForOffice,
      approvalRefreshHint: deviceAuthPolicySeed.approvalRefreshHint
    },
    create: deviceAuthPolicySeed
  });

  for (const request of deviceAuthRequestsSeed) {
    await prisma.deviceAuthRequest.upsert({
      where: { id: request.id },
      update: {
        employeeId: employeesByCode.get(request.employeeCode) ?? null,
        employeeCode: request.employeeCode,
        employeeName: request.employeeName,
        avatar: request.avatar,
        department: request.department,
        branch: request.branch,
        deviceName: request.deviceName,
        deviceId: request.deviceId,
        submittedAt: toDeviceDateTime(request.submittedAt) ?? new Date(),
        status: normalizeDeviceAuthStatus(request.status),
        lastUsedAt: toDeviceDateTime(request.lastUsedAt),
        note: request.note
      },
      create: {
        id: request.id,
        employeeId: employeesByCode.get(request.employeeCode) ?? null,
        employeeCode: request.employeeCode,
        employeeName: request.employeeName,
        avatar: request.avatar,
        department: request.department,
        branch: request.branch,
        deviceName: request.deviceName,
        deviceId: request.deviceId,
        submittedAt: toDeviceDateTime(request.submittedAt) ?? new Date(),
        status: normalizeDeviceAuthStatus(request.status),
        lastUsedAt: toDeviceDateTime(request.lastUsedAt),
        note: request.note
      }
    });
  }
}

async function main() {
  await seedPermissionDefinitions();
  await seedPermissionGroups();
  await prepareDepartmentTreeReset();
  await seedDepartments();
  await seedJobCatalog();
  await seedUserAccounts();
  await seedEmployees();
  await finishDepartmentTreeReset();
  await seedContracts();
  await seedLeaveRequests();
  await seedAttendance();
  await seedPayroll();
  await seedDeviceAuth();
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
