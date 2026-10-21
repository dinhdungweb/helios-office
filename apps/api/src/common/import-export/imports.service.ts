import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { ImportJob, Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import { AuditService } from "../audit/audit.service";
import { DataScopeService } from "../data-scope/data-scope.service";
import type { ResolvedScope } from "../data-scope/data-scope.types";
import { ObjectStorageService } from "../files/object-storage.service";
import { PrismaService } from "../prisma/prisma.service";
import { IMPORTS_QUEUE } from "../queue/queue.constants";
import { QueueService } from "../queue/queue.service";
import { ImportExportRegistry } from "./import-export.registry";
import type { RowIssue, TransferContext } from "./import-export.types";
import { readSheet, writeSheet } from "./spreadsheet";

export const MAX_IMPORT_ROWS = 5_000;
const PREVIEW_ROWS = 20;
const ERRORS_SHOWN = 500;

export type ImportJobData = { jobId: string };

const asJson = (value: unknown) => value as Prisma.InputJsonValue;

// upload (purpose import_file) → create → worker validates every row → the user reviews errors and
// a preview → commit → worker writes the valid rows through the handler (docs/design/import-export.md).
@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ImportExportRegistry,
    private readonly dataScope: DataScopeService,
    private readonly storage: ObjectStorageService,
    private readonly queue: QueueService,
    private readonly audit: AuditService
  ) {}

  async template(user: AuthenticatedUser, type: string) {
    const handler = this.registry.importHandler(type);
    this.registry.assertAllowed(user, handler);
    return { fileName: `mau-import-${handler.type}.xlsx`, body: await writeSheet(handler.title, handler.columns, [], { withExamples: true }) };
  }

  async create(user: AuthenticatedUser, input: { type: string; fileId: string }) {
    const handler = this.registry.importHandler(input.type);
    this.registry.assertAllowed(user, handler);
    const accountId = user.account!.id;

    const file = await this.prisma.storedFile.findUnique({ where: { id: input.fileId } });
    if (!file || file.status !== "ready" || file.purpose !== "import_file" || file.ownerId !== accountId) {
      throw new BadRequestException("File is not a completed import upload of this account");
    }

    const scope = await this.dataScope.resolve(user, handler.permissionKeys);
    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.importJob.create({
        data: { type: handler.type, fileId: file.id, createdById: accountId, scope: asJson(scope) }
      });
      await tx.auditLog.create({
        data: {
          ...this.audit.contextFields(),
          actorAccountId: accountId,
          action: "import.create",
          entityType: "ImportJob",
          entityId: created.id,
          afterValue: asJson({ type: handler.type, fileId: file.id, fileName: file.fileName })
        }
      });
      return created;
    });

    await this.enqueue(job, "validate", "validating");
    return this.view(job);
  }

  async get(user: AuthenticatedUser, id: string) {
    return this.view(await this.findOwn(user, id));
  }

  async commit(user: AuthenticatedUser, id: string, skipInvalid: boolean) {
    const job = await this.findOwn(user, id);
    this.registry.assertAllowed(user, this.registry.importHandler(job.type));

    if (job.status === "invalid" && !skipInvalid) {
      throw new ConflictException("The file has invalid rows; fix them or commit with skipInvalid");
    }
    if (job.validRows === 0) {
      throw new ConflictException("There are no valid rows to import");
    }
    // Claim the job atomically so a double click cannot import twice.
    const claimed = await this.prisma.importJob.updateMany({
      where: { id: job.id, status: { in: skipInvalid ? ["validated", "invalid"] : ["validated"] } },
      data: { status: "committing" }
    });
    if (claimed.count === 0) {
      throw new ConflictException(`The import is ${job.status} and cannot be committed`);
    }

    await this.enqueue({ ...job, status: "committing" }, "commit", job.status);
    return this.view({ ...job, status: "committing" });
  }

  // Worker: parse the sheet and validate every row through the handler.
  async validateJob(jobId: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId }, include: { file: true } });
    if (!job || job.status !== "validating") return { skipped: true };

    try {
      const handler = this.registry.importHandler(job.type);
      const sheet = await readSheet(await this.storage.get(job.file.objectKey), handler.columns);

      const fileErrors: RowIssue[] = sheet.missingColumns.map((column) => ({ row: 1, column: column.key, message: `Thiếu cột "${column.header}"` }));
      if (sheet.rows.length === 0 && fileErrors.length === 0) fileErrors.push({ row: 1, message: "File không có dòng dữ liệu nào" });
      if (sheet.rows.length > MAX_IMPORT_ROWS) fileErrors.push({ row: 1, message: `File có ${sheet.rows.length} dòng, tối đa ${MAX_IMPORT_ROWS}` });

      if (fileErrors.length) {
        await this.prisma.importJob.update({
          where: { id: job.id },
          data: { status: "invalid", totalRows: sheet.rows.length, validRows: 0, errors: asJson(fileErrors), rows: asJson([]) }
        });
        return { status: "invalid" };
      }

      const results = await handler.validate(sheet.rows, this.context(job));
      const errors: RowIssue[] = results.flatMap((result) => (result.errors ?? []).map((issue) => ({ row: result.row, ...issue })));
      const valid = results.filter((result) => !result.errors?.length && result.data !== undefined).map(({ row, data }) => ({ row, data }));

      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: errors.length ? "invalid" : "validated",
          totalRows: sheet.rows.length,
          validRows: valid.length,
          errors: asJson(errors),
          rows: asJson(valid)
        }
      });
      return { status: errors.length ? "invalid" : "validated", rows: sheet.rows.length, errors: errors.length };
    } catch (error) {
      return this.fail(job.id, error);
    }
  }

  // Worker: write the valid rows. Handlers commit in one transaction, so a failure changes nothing.
  async commitJob(jobId: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== "committing") return { skipped: true };

    try {
      const handler = this.registry.importHandler(job.type);
      const result = await handler.commit((job.rows as Array<{ row: number; data: unknown }>) ?? [], this.context(job));

      await this.prisma.$transaction([
        this.prisma.importJob.update({ where: { id: job.id }, data: { status: "committed", result: asJson(result), committedAt: new Date(), rows: asJson([]) } }),
        this.prisma.auditLog.create({
          data: {
            actorAccountId: job.createdById,
            action: "import.commit",
            entityType: "ImportJob",
            entityId: job.id,
            afterValue: asJson({ type: job.type, rows: job.validRows, result })
          }
        })
      ]);
      return { status: "committed", ...result };
    } catch (error) {
      return this.fail(job.id, error);
    }
  }

  private context(job: ImportJob): TransferContext {
    return { accountId: job.createdById, employeeId: null, scope: job.scope as unknown as ResolvedScope };
  }

  private async enqueue(job: ImportJob, step: "validate" | "commit", statusOnFailure: ImportJob["status"]) {
    try {
      await this.queue.add(IMPORTS_QUEUE, step, { jobId: job.id } satisfies ImportJobData, { attempts: 1 });
    } catch (error) {
      this.logger.warn(`Import ${job.id} not queued: ${(error as Error).message}`);
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: step === "validate" ? { status: "failed", error: "Hàng đợi xử lý không hoạt động" } : { status: statusOnFailure }
      });
      throw new ServiceUnavailableException("Background processing is unavailable, try again later");
    }
  }

  private async fail(jobId: string, error: unknown) {
    this.logger.error(`Import ${jobId} failed: ${(error as Error).message}`);
    await this.prisma.importJob.update({ where: { id: jobId }, data: { status: "failed", error: (error as Error).message.slice(0, 500) } });
    return { status: "failed" };
  }

  private async findOwn(user: AuthenticatedUser, id: string) {
    const job = await this.prisma.importJob.findFirst({ where: { id, createdById: user.account?.id ?? "" } });
    if (!job) throw new NotFoundException(`Import ${id} was not found`);
    return job;
  }

  private view(job: ImportJob) {
    const errors = (job.errors as RowIssue[] | null) ?? [];
    const rows = (job.rows as Array<{ row: number; data: unknown }> | null) ?? [];
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      totalRows: job.totalRows,
      validRows: job.validRows,
      invalidRows: new Set(errors.filter((issue) => issue.row > 1).map((issue) => issue.row)).size,
      errorCount: errors.length,
      errors: errors.slice(0, ERRORS_SHOWN),
      preview: rows.slice(0, PREVIEW_ROWS),
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      committedAt: job.committedAt
    };
  }
}
