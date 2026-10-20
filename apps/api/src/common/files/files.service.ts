import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { StoredFile } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import type { FileAccessPolicy } from "./file-access-policy";
import { allowedMimeTypes, FILE_PURPOSES, type FilePurpose, maxBytes, safeFileSlug } from "./file-purposes";
import { ObjectStorageService } from "./object-storage.service";

type UploadRequest = { fileName: string; mimeType: string; size: number; purpose: FilePurpose; ownerId: string };

const publicFields = (file: StoredFile) => ({
  id: file.id,
  fileName: file.fileName,
  mimeType: file.mimeType,
  size: file.size,
  purpose: file.purpose,
  ownerType: file.ownerType,
  ownerId: file.ownerId,
  status: file.status,
  createdAt: file.createdAt
});

// Upload: presign → browser PUTs to storage → complete (size/type re-checked against storage).
// Download: access check → short-lived presigned URL. Access is decided by the purpose's policy.
@Injectable()
export class FilesService {
  private readonly policies = new Map<FilePurpose, FileAccessPolicy>();
  private readonly limitsMb: { image: number; document: number };

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
    config: ConfigService
  ) {
    this.limitsMb = {
      image: Number(config.get("FILE_MAX_IMAGE_MB") ?? 10),
      document: Number(config.get("FILE_MAX_DOCUMENT_MB") ?? 25)
    };
  }

  registerPolicy(policy: FileAccessPolicy) {
    this.policies.set(policy.purpose, policy);
  }

  async presignUpload(user: AuthenticatedUser, request: UploadRequest) {
    const file = await this.createPending(user, request);
    const uploadUrl = await this.storage.presignUpload(file.objectKey, file.mimeType);
    return { file: publicFields(file), uploadUrl, method: "PUT", headers: { "Content-Type": file.mimeType } };
  }

  // Confirms a presigned upload: the object must exist and match the declared type and limits.
  async complete(user: AuthenticatedUser, fileId: string) {
    const file = await this.findForUploader(user, fileId);
    if (file.status === "ready") return publicFields(file);
    if (file.status !== "pending") throw new NotFoundException(`File ${fileId} was not found`);

    const stored = await this.storage.head(file.objectKey);
    if (!stored) {
      throw new ConflictException("The file has not been uploaded to storage yet");
    }

    const limit = maxBytes(file.purpose as FilePurpose, this.limitsMb);
    const typeMatches = stored.contentType.split(";")[0].trim() === file.mimeType;
    if (stored.size > limit || stored.size === 0 || !typeMatches) {
      await this.storage.delete(file.objectKey);
      await this.prisma.storedFile.update({ where: { id: file.id }, data: { status: "deleted", deletedAt: new Date() } });
      throw new BadRequestException(
        !typeMatches ? "Uploaded content type does not match the declared type" : `File size must be between 1 byte and ${limit} bytes`
      );
    }

    const ready = await this.prisma.storedFile.update({
      where: { id: file.id },
      data: { status: "ready", size: stored.size, checksum: stored.etag }
    });
    return publicFields(ready);
  }

  // Multipart fallback for scripts and integrations; the API holds the bytes, so keep it small.
  async uploadDirect(user: AuthenticatedUser, purpose: FilePurpose, ownerId: string, upload: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    const file = await this.createPending(user, { fileName: upload.originalname, mimeType: upload.mimetype, size: upload.size, purpose, ownerId });
    const { etag } = await this.storage.put(file.objectKey, upload.buffer, file.mimeType);
    const ready = await this.prisma.storedFile.update({ where: { id: file.id }, data: { status: "ready", checksum: etag } });
    return publicFields(ready);
  }

  async downloadUrl(user: AuthenticatedUser, fileId: string) {
    const file = await this.prisma.storedFile.findUnique({ where: { id: fileId } });
    // Missing, unfinished, deleted and forbidden all look the same: no existence leak.
    if (!file || file.status !== "ready" || !(await this.policyFor(file).canRead(user, file))) {
      throw new NotFoundException(`File ${fileId} was not found`);
    }
    return this.storage.presignDownload(file.objectKey, file.fileName, file.mimeType);
  }

  async remove(user: AuthenticatedUser, fileId: string) {
    const file = await this.prisma.storedFile.findUnique({ where: { id: fileId } });
    if (!file || file.status === "deleted" || !(await this.policyFor(file).canRead(user, file))) {
      throw new NotFoundException(`File ${fileId} was not found`);
    }
    if (!(await this.policyFor(file).canDelete(user, file))) {
      throw new ForbiddenException("You may not delete this file");
    }

    await this.storage.delete(file.objectKey);
    await this.prisma.storedFile.update({ where: { id: file.id }, data: { status: "deleted", deletedAt: new Date() } });
    return { id: file.id, deleted: true };
  }

  private async createPending(user: AuthenticatedUser, request: UploadRequest) {
    const purpose = FILE_PURPOSES[request.purpose];
    const owner = { ownerType: purpose.ownerType, ownerId: request.ownerId };

    if (!allowedMimeTypes(request.purpose).includes(request.mimeType)) {
      throw new BadRequestException(`${request.mimeType} is not allowed for ${request.purpose}`);
    }
    const limit = maxBytes(request.purpose, this.limitsMb);
    if (request.size > limit) {
      throw new BadRequestException(`File is larger than ${limit / 1024 / 1024} MB`);
    }
    const policy = this.policies.get(request.purpose);
    if (!policy || !(await policy.canUpload(user, owner))) {
      throw new ForbiddenException("You may not upload this file");
    }

    const now = new Date();
    const id = randomUUID();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");

    return this.prisma.storedFile.create({
      data: {
        id,
        bucket: this.storage.bucket,
        objectKey: `${request.purpose}/${now.getUTCFullYear()}/${month}/${id}-${safeFileSlug(request.fileName)}`,
        fileName: request.fileName,
        mimeType: request.mimeType,
        size: request.size,
        purpose: request.purpose,
        ...owner,
        uploadedById: user.account?.id
      }
    });
  }

  private async findForUploader(user: AuthenticatedUser, fileId: string) {
    const file = await this.prisma.storedFile.findUnique({ where: { id: fileId } });
    if (!file || file.uploadedById !== user.account?.id) {
      throw new NotFoundException(`File ${fileId} was not found`);
    }
    return file;
  }

  private policyFor(file: StoredFile): Pick<FileAccessPolicy, "canRead" | "canDelete"> {
    return this.policies.get(file.purpose as FilePurpose) ?? { canRead: async () => false, canDelete: async () => false };
  }
}
