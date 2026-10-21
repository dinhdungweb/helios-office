import { Module } from "@nestjs/common";
import { AdminSettingsModule } from "../admin-settings/admin-settings.module";
import { AuthModule } from "../auth/auth.module";
import { ContractsController } from "./contracts.controller";
import { DepartmentsController } from "./departments.controller";
import { EmployeeDocumentFilePolicy } from "./employee-document-file.policy";
import { EmployeesController } from "./employees.controller";
import { EmployeesService } from "./employees.service";
import { JobCatalogController } from "./job-catalog.controller";

@Module({
  imports: [AuthModule, AdminSettingsModule],
  controllers: [EmployeesController, DepartmentsController, JobCatalogController, ContractsController],
  providers: [EmployeesService, EmployeeDocumentFilePolicy],
  exports: [EmployeesService]
})
export class EmployeesModule {}
