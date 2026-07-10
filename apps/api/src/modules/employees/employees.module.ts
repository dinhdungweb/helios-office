import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ContractsController } from "./contracts.controller";
import { DepartmentsController } from "./departments.controller";
import { EmployeesController } from "./employees.controller";
import { EmployeesService } from "./employees.service";

@Module({
  imports: [AuthModule],
  controllers: [EmployeesController, DepartmentsController, ContractsController],
  providers: [EmployeesService],
  exports: [EmployeesService]
})
export class EmployeesModule {}
