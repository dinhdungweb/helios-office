import { Module } from "@nestjs/common";
import { EmployeeExportHandler } from "./employee-export.handler";
import { JobPositionImportHandler } from "./job-position-import.handler";

// Import/export handlers of the employees area. Kept apart from EmployeesModule (Keycloak, mail...)
// so the worker process can load them; both the API and the worker import this module.
@Module({
  providers: [EmployeeExportHandler, JobPositionImportHandler]
})
export class EmployeeTransferModule {}
