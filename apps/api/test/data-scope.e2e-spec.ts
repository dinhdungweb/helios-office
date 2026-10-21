import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Prisma } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { AuthService } from "../src/modules/auth/auth.service";
import type { AuthenticatedUser } from "../src/modules/auth/auth.types";

// Verifies data scope through the HTTP stack: guard → controller → DataScopeService → Prisma query.

const KEY = "employees.department.manage";

const departments = [
  { id: "company", parentId: null, permissionStructure: "company" },
  { id: "sales", parentId: "company", permissionStructure: "department" },
  { id: "accounting", parentId: "company", permissionStructure: "department" }
];
const employees = [
  { id: "sales-head", departmentId: "sales", managerId: null },
  { id: "sales-staff", departmentId: "sales", managerId: "sales-head" },
  { id: "accountant", departmentId: "accounting", managerId: null }
];

const accounts: Record<string, { employeeId: string; scope: string; adminRole: "user" | "system_admin" }> = {
  "token-sales-department": { employeeId: "sales-head", scope: "department", adminRole: "user" },
  "token-company": { employeeId: "accountant", scope: "company", adminRole: "user" }
};

const employeeQueries: Prisma.EmployeeWhereInput[] = [];

function matches(employee: (typeof employees)[number], where: Prisma.EmployeeWhereInput): boolean {
  if (where.AND) return ([] as Prisma.EmployeeWhereInput[]).concat(where.AND).every((part) => matches(employee, part));
  if (where.OR) return where.OR.some((part) => matches(employee, part));
  if (typeof where.id === "string") return employee.id === where.id;
  if (where.id && typeof where.id === "object" && "in" in where.id) return (where.id.in as string[]).includes(employee.id);
  if (where.departmentId && typeof where.departmentId === "object" && "in" in where.departmentId) {
    return (where.departmentId.in as string[]).includes(employee.departmentId);
  }
  return Object.keys(where).length === 0;
}

function accountRecord(token: string) {
  const account = accounts[token];
  return {
    id: token,
    adminRole: account.adminRole,
    accountStatus: "active",
    customPermissionsEnabled: false,
    customPermissions: null,
    customPermissionScopes: null,
    permissionGroup: { status: "active", permissions: [KEY], permissionScopes: { [KEY]: account.scope } }
  };
}

const prismaStub = {
  $connect: async () => undefined,
  $disconnect: async () => undefined,
  userAccount: { findUnique: async ({ where }: { where: { id: string } }) => (accounts[where.id] ? accountRecord(where.id) : null) },
  permissionDefinition: {
    findMany: async (args?: { where?: { key?: { in?: string[] } } }) =>
      [{ key: KEY, scopable: true, defaultScope: "department" }].filter(
        (definition) => !args?.where?.key?.in || args.where.key.in.includes(definition.key)
      )
  },
  // Security policies (AU-18/19) read by the auth guard and /auth/me: none stored = defaults.
  adminSetting: { findUnique: async () => null },
  department: { findMany: async () => departments },
  employee: {
    findMany: async (args: { where?: Prisma.EmployeeWhereInput; include?: unknown }) => {
      // Directory listing (has include) is recorded; scope resolution reads the plain tree.
      if (args?.include) {
        employeeQueries.push(args.where ?? {});
        return [];
      }
      return employees;
    },
    findUnique: async ({ where }: { where: { id: string } }) => employees.find((employee) => employee.id === where.id) ?? null,
    count: async ({ where }: { where: Prisma.EmployeeWhereInput }) => employees.filter((employee) => matches(employee, where)).length
  }
};

function fakeUser(token: string): AuthenticatedUser {
  const account = accounts[token];
  return {
    sub: token,
    roles: [],
    claims: {},
    account: {
      id: token,
      email: `${token}@helios.test`,
      displayName: token,
      employeeId: account.employeeId,
      adminRole: account.adminRole,
      accountStatus: "active",
      effectivePermissionKeys: [KEY]
    }
  };
}

describe("Data scope on /employees (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.KEYCLOAK_ISSUER = "http://127.0.0.1:9/realms/helios-e2e";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    jest.spyOn(app.get(AuthService), "verifyAuthorizationHeader").mockImplementation(async (header) => {
      const token = typeof header === "string" ? header.replace(/^Bearer\s+/i, "") : "";
      return fakeUser(token);
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  const get = (path: string, token: string) =>
    request(app.getHttpServer()).get(`/api/v1${path}`).set("Authorization", `Bearer ${token}`);

  it("lists only the caller's department (plus reports) for a department-scoped grant", async () => {
    employeeQueries.length = 0;
    await get("/employees", "token-sales-department").expect(200);
    const visible = employees.filter((employee) => matches(employee, employeeQueries[0])).map((employee) => employee.id);
    expect(visible.sort()).toEqual(["sales-head", "sales-staff"]);
  });

  it("lists everyone for a company-wide grant", async () => {
    employeeQueries.length = 0;
    await get("/employees", "token-company").expect(200);
    expect(employeeQueries[0]).toEqual({});
  });

  it("returns 404 for a single employee outside the scope", async () => {
    await get("/employees/accountant", "token-sales-department").expect(404);
  });

  it("returns 404 when updating an employee outside the scope", async () => {
    await request(app.getHttpServer())
      .patch("/api/v1/employees/accountant")
      .set("Authorization", "Bearer token-sales-department")
      .send({ fullName: "Changed" })
      .expect(404);
  });

  it("exposes the caller's scopes on /auth/me", async () => {
    const response = await get("/auth/me", "token-sales-department").expect(200);
    expect(response.body.permissionScopes).toEqual({ [KEY]: "department" });
  });

  it("does not let a non-admin read another account's effective permissions", async () => {
    await get("/account-access/accounts/token-company/effective-permissions", "token-sales-department").expect(403);
  });

  it("rejects moving an employee into a department outside the scope", async () => {
    await request(app.getHttpServer())
      .patch("/api/v1/employees/sales-staff")
      .set("Authorization", "Bearer token-sales-department")
      .send({ departmentId: "accounting" })
      .expect(400);
  });
});
