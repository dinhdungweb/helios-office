import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AuditService } from "../../common/audit/audit.service";
import type { DataScopeService } from "../../common/data-scope/data-scope.service";
import type { ResolvedScope } from "../../common/data-scope/data-scope.types";
import type { ObjectStorageService } from "../../common/files/object-storage.service";
import type { PrismaService } from "../../common/prisma/prisma.service";
import type { AdminSettingsService } from "../admin-settings/admin-settings.service";
import type { KeycloakAdminService } from "../auth/keycloak-admin.service";
import { EmployeesService } from "./employees.service";

type FileRow = { id: string; status: string; purpose: string; ownerType: string; ownerId: string; objectKey: string; fileName: string; mimeType: string; size: number };
type DocumentRow = { id: string; employeeId: string; fieldName: string; fileName: string; mimeType: string; size: number; fileId: string | null };

let files: Map<string, FileRow>;
let documents: Map<string, DocumentRow>;
let auditActions: string[];
let deletedObjects: string[];
let outOfScope: Set<string>;

const prisma = {
  storedFile: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const file = files.get(where.id);
      return file ? { ...file, employeeDocument: [...documents.values()].find((doc) => doc.fileId === file.id) ?? null } : null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<FileRow> }) => {
      files.set(where.id, { ...files.get(where.id)!, ...data });
    }
  },
  employeeDocument: {
    create: async ({ data }: { data: Omit<DocumentRow, "id"> }) => {
      const row = { id: `doc-${documents.size + 1}`, ...data };
      documents.set(row.id, row);
      return { ...row, createdAt: new Date() };
    },
    findFirst: async ({ where }: { where: { id: string; employeeId: string } }) => {
      const row = documents.get(where.id);
      if (!row || row.employeeId !== where.employeeId) return null;
      return { ...row, file: row.fileId ? files.get(row.fileId) ?? null : null };
    },
    delete: async ({ where }: { where: { id: string } }) => {
      documents.delete(where.id);
    }
  },
  auditLog: {
    create: async ({ data }: { data: { action: string } }) => {
      auditActions.push(data.action);
    }
  },
  $transaction: async (run: (tx: unknown) => Promise<unknown>) => run(prisma)
} as unknown as PrismaService;

const dataScope = {
  assertEmployeeInScope: async (_scope: ResolvedScope, employeeId: string) => {
    if (outOfScope.has(employeeId)) throw new NotFoundException();
  }
} as unknown as DataScopeService;

const storage = {
  delete: async (key: string) => {
    deletedObjects.push(key);
  }
} as unknown as ObjectStorageService;

const audit = { contextFields: () => ({}) } as unknown as AuditService;
const scope = { level: "company" } as unknown as ResolvedScope;

const service = new EmployeesService(
  prisma,
  {} as KeycloakAdminService,
  { get: () => undefined } as unknown as ConfigService,
  {} as AdminSettingsService,
  dataScope,
  audit,
  storage
);

function addFile(overrides: Partial<FileRow> = {}) {
  const file: FileRow = {
    id: `file-${files.size + 1}`,
    status: "ready",
    purpose: "employee_document",
    ownerType: "Employee",
    ownerId: "emp-1",
    objectKey: `employee_document/emp-1/file-${files.size + 1}.pdf`,
    fileName: "cv.pdf",
    mimeType: "application/pdf",
    size: 100,
    ...overrides
  };
  files.set(file.id, file);
  return file;
}

beforeEach(() => {
  files = new Map();
  documents = new Map();
  auditActions = [];
  deletedObjects = [];
  outOfScope = new Set();
});

describe("EmployeesService documents (HR-07)", () => {
  it("attaches a ready employee_document file owned by the employee", async () => {
    const file = addFile();

    const document = await service.attachDocument("emp-1", { fileId: file.id, fieldName: "cv" }, "actor", scope);

    expect(document).toMatchObject({ fieldName: "cv", fileName: "cv.pdf", size: 100 });
    expect(documents.get(document.id)?.fileId).toBe(file.id);
    expect(auditActions).toEqual(["employee.document.attach"]);
  });

  it.each([
    ["missing", null],
    ["not uploaded yet", { status: "pending" }],
    ["another purpose", { purpose: "avatar" }],
    ["owned by another employee", { ownerId: "emp-2" }]
  ])("rejects a file that is %s", async (_label, overrides) => {
    const fileId = overrides ? addFile(overrides).id : "file-missing";

    await expect(service.attachDocument("emp-1", { fileId, fieldName: "cv" }, "actor", scope)).rejects.toBeInstanceOf(BadRequestException);
    expect(documents.size).toBe(0);
  });

  it("rejects attaching the same file twice", async () => {
    const file = addFile();
    await service.attachDocument("emp-1", { fileId: file.id, fieldName: "cv" }, "actor", scope);

    await expect(service.attachDocument("emp-1", { fileId: file.id, fieldName: "cv" }, "actor", scope)).rejects.toBeInstanceOf(ConflictException);
  });

  it("returns 404 for an employee outside the caller's scope", async () => {
    const file = addFile();
    outOfScope.add("emp-1");

    await expect(service.attachDocument("emp-1", { fileId: file.id, fieldName: "cv" }, "actor", scope)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("removes the document, its stored object and marks the file deleted", async () => {
    const file = addFile();
    const document = await service.attachDocument("emp-1", { fileId: file.id, fieldName: "cv" }, "actor", scope);

    await expect(service.removeDocument("emp-1", document.id, "actor", scope)).resolves.toEqual({ id: document.id, deleted: true });

    expect(documents.size).toBe(0);
    expect(deletedObjects).toEqual([file.objectKey]);
    expect(files.get(file.id)?.status).toBe("deleted");
    expect(auditActions).toEqual(["employee.document.attach", "employee.document.remove"]);
  });

  it("does not serve a document through another employee's profile", async () => {
    const file = addFile();
    const document = await service.attachDocument("emp-1", { fileId: file.id, fieldName: "cv" }, "actor", scope);

    await expect(service.getDocument("emp-2", document.id, scope)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("removes a legacy document whose bytes live in Postgres without touching storage", async () => {
    documents.set("legacy", { id: "legacy", employeeId: "emp-1", fieldName: "cv", fileName: "old.pdf", mimeType: "application/pdf", size: 5, fileId: null });

    await service.removeDocument("emp-1", "legacy", "actor", scope);

    expect(documents.size).toBe(0);
    expect(deletedObjects).toEqual([]);
  });
});
