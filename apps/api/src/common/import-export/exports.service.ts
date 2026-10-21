import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { ExportJob, Prisma, StoredFile } from "@prisma/client";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import { AuditService } from "../audit/audit.service";
import { DataScopeService } from "../data-scope/data-scope.service";
import type { ResolvedScope } from "../data-scope/data-scope.types";
import { FilesService } from "../files/files.service";
import { ObjectStorageService } from "../files/object-storage.service";
import { PrismaService } from "../prisma/prisma.service";
import { EXPORTS_QUEUE } from "../queue/queue.constants";
import { QueueService } from "../queue/queue.service";
import { ImportExportRegistry } from "./import-export.registry";
import { writeSheet, XLSX_MIME_TYPE } from "./spreadsheet";

export type ExportJobData = { jobId: string };

const asJson = (value: unknown) => value as Prisma.InputJsonValue;

// create (scope fixed at request time) → worker builds the .xlsx → StoredFile (purpose export_file,
// owned by the requesting account) → GET returns a short-lived download URL.
@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ImportExportRegistry,
    private readonly dataScope: DataScopeService,
    private readonly files: FilesService,
    private readonly storage: ObjectStorageService,
    private readonly queue: QueueService,
    private readonly audit: AuditService
  ) {}

  async create(user: AuthenticatedUser, input: { type: string; params?: Record<string, unknown> }) {
    const handler = this.registry.exportHandler(input.type);
    this.registry.assertAllowed(user, handler);
    const params = handler.parseParams(input.params ?? {});
    const accountId = user.account!.id;
    const scope = await this.dataScope.resolve(user, handler.permissionKeys);

    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.exportJob.create({
        data: { type: handler.type, params: asJson(params), scope: asJson(scope), createdById: accountId }
      });
      // Exports copy data out of the system, so every request is audited with its filters.
      await tx.auditLog.create({
        data: {
          ...this.audit.contextFields(),
          actorAccountId: accountId,
          action: "export.create",
          entityType: "ExportJob",
          entityId: created.id,
          afterValue: asJson({ type: handler.type, params, scope: scope.level })
        }
      });
      return created;
    });

    try {
      await this.queue.add(EXPORTS_QUEUE, handler.type, { jobId: job.id } satisfies ExportJobData, { attempts: 1 });
    } catch (error) {
      this.logger.warn(`Export ${job.id} not queued: ${(error as Error).message}`);
      await this.prisma.exportJob.update({ where: { id: job.id }, data: { status: "failed", error: "Hàng đợi xử lý không hoạt động", finishedAt: new Date() } });
      throw new ServiceUnavailableException("Background processing is unavailable, try again later");
    }

    return this.view(job, null);
  }

  async get(user: AuthenticatedUser, id: string) {
    const job = await this.prisma.exportJob.findFirst({ where: { id, createdById: user.account?.id ?? "" }, include: { file: true } });
    if (!job) throw new NotFoundException(`Export ${id} was not found`);
    return this.view(job, job.file);
  }

  // Worker: query the rows within the creator's scope and store the workbook.
  async generateJob(jobId: string) {
    const job = await this.prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== "running") return { skipped: true };

    try {
      const handler = this.registry.exportHandler(job.type);
      // Stored already parsed by create(); parsing again could drop normalised keys.
      const params = (job.params ?? {}) as Record<string, unknown>;
      const rows = await handler.rows(params, { accountId: job.createdById, employeeId: null, scope: job.scope as unknown as ResolvedScope });
      const file = await this.files.saveGenerated({
        purpose: "export_file",
        ownerId: job.createdById,
        createdById: job.createdById,
        fileName: handler.fileName(params),
        mimeType: XLSX_MIME_TYPE,
        body: await writeSheet(handler.title, handler.columns, rows)
      });

      await this.prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "ready", fileId: file.id, rowCount: rows.length, finishedAt: new Date() }
      });
      return { status: "ready", rows: rows.length };
    } catch (error) {
      this.logger.error(`Export ${job.id} failed: ${(error as Error).message}`);
      await this.prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "failed", error: (error as Error).message.slice(0, 500), finishedAt: new Date() }
      });
      return { status: "failed" };
    }
  }

  private async view(job: ExportJob, file: StoredFile | null) {
    const ready = job.status === "ready" && file?.status === "ready";
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      params: job.params,
      rowCount: job.rowCount,
      error: job.error,
      fileName: ready ? file!.fileName : null,
      // 5-minute link; call GET again for a fresh one.
      downloadUrl: ready ? await this.storage.presignDownload(file!.objectKey, file!.fileName, file!.mimeType) : null,
      createdAt: job.createdAt,
      finishedAt: job.finishedAt
    };
  }
}
