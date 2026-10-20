import { Global, Module, OnModuleInit } from "@nestjs/common";
import { FilesService } from "../files/files.service";
import { AccountFilePolicy } from "./account-file.policy";
import { ExportsService } from "./exports.service";
import { ExportsController } from "./exports.controller";
import { ImportsController } from "./imports.controller";
import { ImportExportRegistry } from "./import-export.registry";
import { ImportsService } from "./imports.service";

// Global so feature modules can register their import/export handlers. Loaded by the API and the
// worker (which runs the jobs); needs FilesModule, DataScopeModule, QueueModule and AuditModule.
@Global()
@Module({
  controllers: [ImportsController, ExportsController],
  providers: [ImportExportRegistry, ImportsService, ExportsService],
  exports: [ImportExportRegistry, ImportsService, ExportsService]
})
export class ImportExportModule implements OnModuleInit {
  constructor(private readonly files: FilesService) {}

  onModuleInit() {
    this.files.registerPolicy(new AccountFilePolicy("import_file"));
    this.files.registerPolicy(new AccountFilePolicy("export_file"));
  }
}
