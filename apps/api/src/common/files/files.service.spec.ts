import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { StoredFile } from "@prisma/client";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import type { PrismaService } from "../prisma/prisma.service";
import type { FileAccessPolicy } from "./file-access-policy";
import { safeFileSlug } from "./file-purposes";
import { FilesService } from "./files.service";
import type { ObjectStorageService } from "./object-storage.service";

const MB = 1024 * 1024;
let rows: Map<string, StoredFile>;
let objects: Map<string, { size: number; contentType: string }>;

const prisma = {
  storedFile: {
    create: async ({ data }: { data: Partial<StoredFile> }) => {
      const row = { status: "pending", checksum: null, createdAt: new Date(), deletedAt: null, ...data } as StoredFile;
      rows.set(row.id, row);
      return row;
    },
    findUnique: async ({ where }: { where: { id: string } }) => rows.get(where.id) ?? null,
    findMany: async ({ where }: { where: { status: string; createdAt: { lt: Date } } }) =>
      [...rows.values()].filter((row) => row.status === where.status && row.createdAt < where.createdAt.lt),
    updateMany: async ({ where, data }: { where: { id: string; status: string }; data: Partial<StoredFile> }) => {
      const row = rows.get(where.id);
      if (!row || row.status !== where.status) return { count: 0 };
      rows.set(row.id, { ...row, ...data } as StoredFile);
      return { count: 1 };
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<StoredFile> }) => {
      const row = { ...rows.get(where.id)!, ...data } as StoredFile;
      rows.set(row.id, row);
      return row;
    }
  }
} as unknown as PrismaService;

const storage = {
  bucket: "test-bucket",
  presignUpload: async (key: string) => `https://storage.test/${key}?put`,
  presignDownload: async (key: string) => `https://storage.test/${key}?get`,
  head: async (key: string) => (objects.has(key) ? { ...objects.get(key)!, etag: "etag-1" } : null),
  put: async (key: string, body: Buffer, contentType: string) => {
    objects.set(key, { size: body.length, contentType });
    return { etag: "etag-2" };
  },
  delete: async (key: string) => {
    objects.delete(key);
  }
} as unknown as ObjectStorageService;

const config = { get: () => undefined } as unknown as ConfigService;

const user = (accountId: string) => ({ account: { id: accountId } }) as AuthenticatedUser;
const uploader = user("acc-uploader");
const outsider = user("acc-outsider");

// Upload/delete allowed for acc-uploader on emp-1 only; read also for the owner employee.
const policy: FileAccessPolicy = {
  purpose: "employee_document",
  canUpload: async (actor, owner) => actor.account?.id === "acc-uploader" && owner.ownerId === "emp-1",
  canRead: async (actor) => actor.account?.id === "acc-uploader",
  canDelete: async (actor) => actor.account?.id === "acc-uploader"
};

let service: FilesService;

beforeEach(() => {
  rows = new Map();
  objects = new Map();
  service = new FilesService(prisma, storage, config);
  service.registerPolicy(policy);
});

const request = { fileName: "Hợp đồng lao động.pdf", mimeType: "application/pdf", size: 2 * MB, purpose: "employee_document" as const, ownerId: "emp-1" };

describe("FilesService", () => {
  it("presigns an upload with a safe object key", async () => {
    const result = await service.presignUpload(uploader, request);
    const row = rows.get(result.file.id)!;
    expect(row.objectKey).toMatch(/^employee_document\/\d{4}\/\d{2}\/[0-9a-f-]{36}-hop-dong-lao-dong\.pdf$/);
    expect(row).toMatchObject({ ownerType: "Employee", ownerId: "emp-1", status: "pending", uploadedById: "acc-uploader" });
    expect(result.headers).toEqual({ "Content-Type": "application/pdf" });
  });

  it("purges uploads pending over 24 h with their objects, and leaves recent and completed ones (CORE-12)", async () => {
    const stale = (await service.presignUpload(uploader, request)).file;
    const recent = (await service.presignUpload(uploader, request)).file;
    const done = (await service.presignUpload(uploader, request)).file;
    const dayAgo = new Date(Date.now() - 25 * 60 * 60_000);
    for (const id of [stale.id, done.id]) rows.set(id, { ...rows.get(id)!, createdAt: dayAgo });
    rows.set(done.id, { ...rows.get(done.id)!, status: "ready" });
    for (const row of rows.values()) objects.set(row.objectKey, { size: 1, contentType: "application/pdf" });

    await expect(service.purgeStalePending()).resolves.toEqual({ purged: 1 });

    expect(rows.get(stale.id)).toMatchObject({ status: "deleted", deletedAt: expect.any(Date) });
    expect(objects.has(rows.get(stale.id)!.objectKey)).toBe(false);
    expect(rows.get(recent.id)!.status).toBe("pending");
    expect(rows.get(done.id)!.status).toBe("ready");
  });

  it("rejects disallowed types and oversize files before creating anything", async () => {
    await expect(service.presignUpload(uploader, { ...request, mimeType: "application/x-msdownload" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.presignUpload(uploader, { ...request, size: 26 * MB })).rejects.toBeInstanceOf(BadRequestException);
    expect(rows.size).toBe(0);
  });

  it("denies purposes without a policy and owners the policy refuses", async () => {
    await expect(service.presignUpload(uploader, { ...request, purpose: "post_media", mimeType: "image/png" })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.presignUpload(uploader, { ...request, ownerId: "emp-2" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("completes only after the object exists, and only for the uploader", async () => {
    const { file } = await service.presignUpload(uploader, request);
    await expect(service.complete(uploader, file.id)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.complete(outsider, file.id)).rejects.toBeInstanceOf(NotFoundException);

    objects.set(rows.get(file.id)!.objectKey, { size: 1234, contentType: "application/pdf" });
    expect(await service.complete(uploader, file.id)).toMatchObject({ status: "ready", size: 1234 });
  });

  it("discards an upload whose real size or type breaks the rules", async () => {
    const { file } = await service.presignUpload(uploader, request);
    const key = rows.get(file.id)!.objectKey;
    objects.set(key, { size: 30 * MB, contentType: "application/pdf" });
    await expect(service.complete(uploader, file.id)).rejects.toBeInstanceOf(BadRequestException);
    expect(objects.has(key)).toBe(false);
    expect(rows.get(file.id)!.status).toBe("deleted");

    const second = await service.presignUpload(uploader, request);
    objects.set(rows.get(second.file.id)!.objectKey, { size: 100, contentType: "text/html" });
    await expect(service.complete(uploader, second.file.id)).rejects.toThrow("content type");
  });

  it("hides files the caller may not read behind 404", async () => {
    const stored = await service.uploadDirect(uploader, "employee_document", "emp-1", {
      originalname: "cccd.png",
      mimetype: "image/png",
      size: 4,
      buffer: Buffer.from("data")
    });
    expect(await service.downloadUrl(uploader, stored.id)).toContain("?get");
    await expect(service.downloadUrl(outsider, stored.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(outsider, stored.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.downloadUrl(uploader, "missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("deletes from storage and marks the row deleted", async () => {
    const stored = await service.uploadDirect(uploader, "employee_document", "emp-1", { originalname: "a.pdf", mimetype: "application/pdf", size: 3, buffer: Buffer.from("pdf") });
    expect(await service.remove(uploader, stored.id)).toEqual({ id: stored.id, deleted: true });
    expect(objects.size).toBe(0);
    await expect(service.downloadUrl(uploader, stored.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("safeFileSlug", () => {
  it.each([
    ["Hợp đồng lao động.pdf", "hop-dong-lao-dong.pdf"],
    ["../../etc/passwd", "passwd"],
    ["C:\\Users\\hr\\Ảnh thẻ.png", "anh-the.png"],
    ["Ảnh CCCD (mặt trước).JPEG", "anh-cccd-mat-truoc.jpeg"],
    ["....", "file"]
  ])("%s -> %s", (input, expected) => {
    expect(safeFileSlug(input)).toBe(expected);
  });
});
