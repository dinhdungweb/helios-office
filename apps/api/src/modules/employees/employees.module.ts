import { Module } from "@nestjs/common";
import { AdminSettingsModule } from "../admin-settings/admin-settings.module";
import { AuthModule } from "../auth/auth.module";
import { ContractsController } from "./contracts.controller";
import { DepartmentsController } from "./departments.controller";
import { EmployeesController } from "./employees.controller";
import { EmployeesService } from "./employees.service";
import { JobCatalogController } from "./job-catalog.controller";

@Module({
  imports: [AuthModule, AdminSettingsModule],
  controllers: [EmployeesController, DepartmentsController, JobCatalogController, ContractsController],
  providers: [EmployeesService],
  exports: [EmployeesService]
})
export class EmployeesModule {}
