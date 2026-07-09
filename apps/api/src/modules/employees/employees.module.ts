import { Module } from "@nestjs/common";
import { ContractsController } from "./contracts.controller";
import { DepartmentsController } from "./departments.controller";
import { EmployeesController } from "./employees.controller";
import { EmployeesService } from "./employees.service";

@Module({
  controllers: [EmployeesController, DepartmentsController, ContractsController],
  providers: [EmployeesService],
  exports: [EmployeesService]
})
export class EmployeesModule {}
