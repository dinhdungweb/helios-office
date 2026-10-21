import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { ObjectStorageService } from "../src/common/files/object-storage.service";
import { ExportsService } from "../src/common/import-export/exports.service";
import { ImportsService } from "../src/common/import-export/imports.service";
import { readSheet, writeSheet } from "../src/common/import-export/spreadsheet";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { QueueService } from "../src/common/queue/queue.service";
import { AuthService } from "../src/modules/auth/auth.service";
import type { AuthenticatedUser } from "../src/modules/auth/auth.types";

// CORE-18 / CORE-19 through the HTTP stack, with Prisma, the queue and object storage in memory.
// The worker step is run by calling the services' job methods, as ImportExportProcessor does.

const KEY = "employees.department.manage";

const departments = [
  { id: "company", parentId: null, permissionStructure: "company", name: "Công ty" },
  { id: "sales", parentId: "company", permissionStructure: "department", name: "Kinh doanh" },
  { id: "accounting", parentId: "company", permissionStructure: "department", name: "Kế toán" }
];
const employees = [
  { id: "sales-head", code: "E1", fullName: "Trưởng KD", departmentId: "sales", managerId: null, status: "active" },
  { id: "sales-staff", code: "E2", fullName: "Nhân viên KD", departmentId: "sales", managerId: "sales-head", status: "active" },
  { id: "accountant", code: "E3", fullName: "Kế toán viên", departmentId: "accounting", managerId: null, status: "resigned" }
];

const accounts: Record<string, { employeeId: string; scope: string; permissions: string[] }> = {
  "token-sales": { employeeId: "sales-head", scope: "department", permissions: [KEY] },
  "token-company": { employeeId: "accountant", scope: "company", permissions: [KEY] },
  "token-none": { employeeId: "sales-staff", scope: "department", permissions: [] }
};

// Loosely typed on purpose: these rows stand in for several Prisma models.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const tables: Record<"importJob" | "exportJob" | "storedFile" | "jobPosition" | "auditLog", Map<string, Row>> = {
  importJob: new Map(),
  exportJob: new Map(),
  storedFile: new Map(),
  jobPosition: new Map(),
  auditLog: new Map()
};
const objects = new Map<string, Buffer>();
const queued: Array<{ queue: string; name: string; data: { jobId: string } }> = [];

function matches(employee: (typeof employees)[number], where: Prisma.EmployeeWhereInput): boolean {
  if (where.AND) return ([] as Prisma.EmployeeWhereInput[]).concat(where.AND).every((part) => matches(employee, part));
  if (where.OR) return where.OR.some((part) => matches(employee, part));
  if (typeof where.id === "string") return employee.id === where.id;
  if (where.id && typeof where.id === "object" && "in" in where.id) return (where.id.in as string[]).includes(employee.id);
  if (where.departmentId && typeof where.departmentId === "object" && "in" in where.departmentId) {
    return (where.departmentId.in as string[]).includes(employee.departmentId);
  }
  if (typeof where.departmentId === "string") return employee.departmentId === where.departmentId;
  if (where.status && typeof where.status === "object" && "in" in where.status) return (where.status.in as string[]).includes(employee.status);
  return Object.keys(where).length === 0;
}

// A tiny in-memory table: enough of Prisma's API for the import/export services and handlers.
function table(name: keyof typeof tables) {
  const rows = tables[name];
  const pick = (where: Row = {}) =>
    [...rows.values()].filter((row) =>
      Object.entries(where).every(([key, value]) =>
        value && typeof value === "object" && "in" in value ? (value.in as unknown[]).includes(row[key]) : row[key] === value
      )
    );
  const withFile = (row: Row | undefined, include?: Row) =>
    row && include?.file ? { ...row, file: row.fileId ? tables.storedFile.get(row.fileId) ?? null : null } : row ?? null;

  return {
    create: async ({ data }: { data: Row }) => {
      const row = { id: randomUUID(), createdAt: new Date(), ...data };
      if (name === "importJob") Object.assign(row, { status: "validating", totalRows: 0, validRows: 0, errors: null, rows: null, result: null, error: null, committedAt: null, ...data });
      if (name === "exportJob") Object.assign(row, { status: "running", fileId: null, rowCount: null, error: null, finishedAt: null, ...data });
      rows.set(row.id, row);
      return row;
    },
    findUnique: async ({ where, include }: { where: Row; include?: Row }) => withFile(where.id ? rows.get(where.id) : pick(where)[0], include),
    findFirst: async ({ where, include }: { where: Row; include?: Row }) => withFile(pick(where)[0], include),
    findMany: async ({ where }: { where?: Row } = {}) => pick(where),
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = { ...rows.get(where.id)!, ...data };
      rows.set(row.id, row);
      return row;
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const found = pick(where);
      found.forEach((row) => rows.set(row.id, { ...row, ...data }));
      return { count: found.length };
    },
    upsert: async ({ where, create, update }: { where: Row; create: Row; update: Row }) => {
      const existing = pick(where)[0];
      const row = existing ? { ...existing, ...update } : { id: randomUUID(), ...create };
      rows.set(row.id, row);
      return row;
    }
  };
}

function accountRecord(token: string) {
  const account = accounts[token];
  return {
    id: token,
    adminRole: "user",
    accountStatus: "active",
    customPermissionsEnabled: false,
    customPermissions: null,
    customPermissionScopes: null,
    permissionGroup: { status: "active", permissions: account.permissions, permissionScopes: { [KEY]: account.scope } }
  };
}

const prismaStub: Row = {
  $connect: async () => undefined,
  $disconnect: async () => undefined,
  userAccount: { findUnique: async ({ where }: { where: { id: string } }) => (accounts[where.id] ? accountRecord(where.id) : null) },
  permissionDefinition: {
    findMany: async (args?: { where?: { key?: { in?: string[] } } }) =>
      [{ key: KEY, scopable: true, defaultScope: "department" }].filter((definition) => !args?.where?.key?.in || args.where.key.in.includes(definition.key))
  },
  // Security policies (AU-18/19) read by the auth guard and /auth/me: none stored = defaults.
  adminSetting: { findUnique: async () => null },
  department: { findMany: async () => departments },
  employee: {
    findMany: async (args: { where?: Prisma.EmployeeWhereInput; include?: unknown }) => {
      const found = employees.filter((employee) => matches(employee, args?.where ?? {}));
      if (!args?.include) return found;
      return found.map((employee) => ({
        ...employee,
        title: "",
        employeeType: null,
        startDate: new Date(Date.UTC(2025, 0, 2)),
        officialStartDate: null,
        attendanceCode: null,
        department: departments.find((department) => department.id === employee.departmentId),
        position: null,
        jobTitle: null,
        manager: employees.find((manager) => manager.id === employee.managerId) ?? null,
        userAccount: null
      }));
    },
    findUnique: async ({ where }: { where: { id: string } }) => employees.find((employee) => employee.id === where.id) ?? null,
    count: async ({ where }: { where: Prisma.EmployeeWhereInput }) => employees.filter((employee) => matches(employee, where)).length
  },
  importJob: table("importJob"),
  exportJob: table("exportJob"),
  storedFile: table("storedFile"),
  jobPosition: table("jobPosition"),
  auditLog: table("auditLog"),
  $transaction: async (input: unknown) => (typeof input === "function" ? input(prismaStub) : Promise.all(input as Promise<unknown>[]))
};

const storageStub = {
  bucket: "test",
  put: async (key: string, body: Buffer) => {
    objects.set(key, body);
    return { etag: "etag" };
  },
  get: async (key: string) => objects.get(key)!,
  presignDownload: async (key: string) => `https://storage.test/${key}`,
  presignUpload: async (key: string) => `https://storage.test/${key}?put`,
  head: async () => null,
  delete: async (key: string) => {
    objects.delete(key);
  }
};

const queueStub = {
  add: async (queue: string, name: string, data: { jobId: string }) => {
    queued.push({ queue, name, data });
    return { id: String(queued.length) };
  },
  ping: async () => true,
  workerHeartbeat: async () => null,
  redisUrl: () => "redis://test",
  onModuleDestroy: async () => undefined
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
      adminRole: "user",
      accountStatus: "active",
      effectivePermissionKeys: account.permissions
    }
  };
}

// An uploaded import file owned by `token`, as /files/presign + complete would leave it.
async function uploadedSheet(token: string, rows: unknown[][]) {
  const headers = ["Mã vị trí", "Tên vị trí", "Nhóm vị trí"];
  const body = await writeSheet("Vị trí", headers.map((header, index) => ({ key: `c${index}`, header })), rows.map((row) => Object.fromEntries(row.map((value, index) => [`c${index}`, value]))) as never);
  const id = randomUUID();
  objects.set(`import_file/${id}`, body);
  tables.storedFile.set(id, { id, objectKey: `import_file/${id}`, fileName: "vi-tri.xlsx", mimeType: "x", purpose: "import_file", ownerId: token, status: "ready" });
  return id;
}

describe("Import / export (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.KEYCLOAK_ISSUER = "http://127.0.0.1:9/realms/helios-e2e";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .overrideProvider(ObjectStorageService)
      .useValue(storageStub)
      .overrideProvider(QueueService)
      .useValue(queueStub)
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

  const call = (method: "get" | "post", path: string, token: string) =>
    request(app.getHttpServer())[method](`/api/v1${path}`).set("Authorization", `Bearer ${token}`);
  const runQueued = async () => {
    while (queued.length) {
      const job = queued.shift()!;
      if (job.queue === "exports") await app.get(ExportsService).generateJob(job.data.jobId);
      else if (job.name === "commit") await app.get(ImportsService).commitJob(job.data.jobId);
      else await app.get(ImportsService).validateJob(job.data.jobId);
    }
  };

  describe("export", () => {
    it("builds an .xlsx limited to the requester's data scope", async () => {
      const created = await call("post", "/exports", "token-sales").send({ type: "employees" }).expect(201);
      expect(created.body.status).toBe("running");

      await runQueued();
      const job = await call("get", `/exports/${created.body.id}`, "token-sales").expect(200);

      expect(job.body).toMatchObject({ status: "ready", rowCount: 2 });
      expect(job.body.downloadUrl).toMatch(/^https:\/\/storage\.test\/export_file\//);
      const key = job.body.downloadUrl.replace("https://storage.test/", "");
      const sheet = await readSheet(objects.get(key)!, [{ key: "code", header: "Mã nhân sự" }, { key: "department", header: "Phòng ban" }, { key: "manager", header: "Quản lý trực tiếp" }]);
      expect(sheet.rows.map((row) => row.values)).toEqual([
        { code: "E1", department: "Kinh doanh", manager: null },
        { code: "E2", department: "Kinh doanh", manager: "Trưởng KD" }
      ]);
      expect([...tables.auditLog.values()].some((entry) => entry.action === "export.create" && entry.entityId === created.body.id)).toBe(true);
    });

    it("applies filters within a company-wide scope", async () => {
      const created = await call("post", "/exports", "token-company").send({ type: "employees", params: { status: "resigned,offboarding" } }).expect(201);
      await runQueued();
      expect((await call("get", `/exports/${created.body.id}`, "token-company")).body.rowCount).toBe(1);
    });

    it("hides another account's export and rejects bad requests", async () => {
      const created = await call("post", "/exports", "token-sales").send({ type: "employees" }).expect(201);
      await call("get", `/exports/${created.body.id}`, "token-company").expect(404);
      await call("post", "/exports", "token-sales").send({ type: "nope" }).expect(400);
      await call("post", "/exports", "token-sales").send({ type: "employees", params: { status: "fired" } }).expect(400);
      await call("post", "/exports", "token-none").send({ type: "employees" }).expect(403);
      queued.length = 0;
    });

    it("lists only the types the caller may use", async () => {
      expect((await call("get", "/exports/types", "token-sales")).body.map((type: { type: string }) => type.type)).toContain("employees");
      expect((await call("get", "/exports/types", "token-none")).body).toEqual([]);
    });
  });

  describe("import", () => {
    beforeEach(() => {
      tables.jobPosition.clear();
      tables.jobPosition.set("existing", { id: "existing", code: "POS-OLD", name: "Vị trí cũ", family: null, description: null });
    });

    it("validates rows, previews, refuses to commit with errors, then commits the valid rows", async () => {
      const fileId = await uploadedSheet("token-sales", [
        ["POS-OLD", "Vị trí cũ (đổi tên)", "Nhóm A"],
        ["POS-NEW", "Vị trí mới", null],
        ["POS-NEW", "Trùng mã", null],
        ["X", null, null]
      ]);

      const created = await call("post", "/imports", "token-sales").send({ type: "job_positions", fileId }).expect(201);
      await runQueued();
      const validated = await call("get", `/imports/${created.body.id}`, "token-sales").expect(200);

      expect(validated.body).toMatchObject({ status: "invalid", totalRows: 4, validRows: 2, invalidRows: 2 });
      expect(validated.body.errors).toEqual(
        expect.arrayContaining([
          { row: 4, column: "code", message: "Mã trùng với dòng 3" },
          { row: 5, column: "code", message: "Mã vị trí bắt buộc, tối thiểu 2 ký tự" },
          { row: 5, column: "name", message: "Tên vị trí bắt buộc, tối thiểu 2 ký tự" }
        ])
      );
      expect(validated.body.preview.map((row: { row: number }) => row.row)).toEqual([2, 3]);

      await call("post", `/imports/${created.body.id}/commit`, "token-sales").send({}).expect(409);
      const committing = await call("post", `/imports/${created.body.id}/commit`, "token-sales").send({ skipInvalid: true }).expect(201);
      expect(committing.body.status).toBe("committing");
      await call("post", `/imports/${created.body.id}/commit`, "token-sales").send({ skipInvalid: true }).expect(409);

      await runQueued();
      const committed = await call("get", `/imports/${created.body.id}`, "token-sales").expect(200);

      expect(committed.body).toMatchObject({ status: "committed", result: { created: 1, updated: 1 } });
      expect([...tables.jobPosition.values()].map((position) => [position.code, position.name]).sort()).toEqual([
        ["POS-NEW", "Vị trí mới"],
        ["POS-OLD", "Vị trí cũ (đổi tên)"]
      ]);
      expect([...tables.auditLog.values()].filter((entry) => entry.action === "import.commit")).toHaveLength(1);
    });

    it("marks a file without the required columns invalid", async () => {
      const id = randomUUID();
      objects.set(`import_file/${id}`, await writeSheet("x", [{ key: "a", header: "Cột khác" }], [{ a: "1" }]));
      tables.storedFile.set(id, { id, objectKey: `import_file/${id}`, fileName: "x.xlsx", purpose: "import_file", ownerId: "token-sales", status: "ready" });

      const created = await call("post", "/imports", "token-sales").send({ type: "job_positions", fileId: id }).expect(201);
      await runQueued();
      const job = await call("get", `/imports/${created.body.id}`, "token-sales").expect(200);

      expect(job.body.status).toBe("invalid");
      expect(job.body.errors.map((issue: { message: string }) => issue.message)).toEqual(['Thiếu cột "Mã vị trí"', 'Thiếu cột "Tên vị trí"']);
      await call("post", `/imports/${created.body.id}/commit`, "token-sales").send({ skipInvalid: true }).expect(409);
    });

    it("only accepts the caller's own completed import upload", async () => {
      const otherOwner = await uploadedSheet("token-company", [["POS-1", "Một", null]]);
      await call("post", "/imports", "token-sales").send({ type: "job_positions", fileId: otherOwner }).expect(400);
      await call("post", "/imports", "token-none").send({ type: "job_positions", fileId: otherOwner }).expect(403);

      const own = await uploadedSheet("token-sales", [["POS-1", "Một", null]]);
      const created = await call("post", "/imports", "token-sales").send({ type: "job_positions", fileId: own }).expect(201);
      await call("get", `/imports/${created.body.id}`, "token-company").expect(404);
      queued.length = 0;
    });

    it("serves a template that the importer reads back", async () => {
      const response = await call("get", "/imports/templates/job_positions", "token-sales")
        .buffer(true)
        .parse((res, done) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(response.headers["content-type"]).toContain("spreadsheetml");
      const sheet = await readSheet(response.body as Buffer, [{ key: "code", header: "Mã vị trí", required: true }]);
      expect(sheet).toEqual({ rows: [{ row: 2, values: { code: "POS-HR" } }], missingColumns: [] });
    });
  });
});
