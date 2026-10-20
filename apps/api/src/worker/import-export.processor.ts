import { Injectable, OnModuleInit } from "@nestjs/common";
import { ExportsService, type ExportJobData } from "../common/import-export/exports.service";
import { ImportsService, type ImportJobData } from "../common/import-export/imports.service";
import { EXPORTS_QUEUE, IMPORTS_QUEUE } from "../common/queue/queue.constants";
import { WorkerRuntime } from "./worker-runtime.service";

// Runs import validation/commit and export generation. Low concurrency: each job holds a whole
// workbook in memory.
@Injectable()
export class ImportExportProcessor implements OnModuleInit {
  constructor(
    private readonly runtime: WorkerRuntime,
    private readonly imports: ImportsService,
    private readonly exports: ExportsService
  ) {}

  onModuleInit() {
    this.runtime.register<ImportJobData>(
      IMPORTS_QUEUE,
      (job) => (job.name === "commit" ? this.imports.commitJob(job.data.jobId) : this.imports.validateJob(job.data.jobId)),
      2
    );
    this.runtime.register<ExportJobData>(EXPORTS_QUEUE, (job) => this.exports.generateJob(job.data.jobId), 2);
  }
}
