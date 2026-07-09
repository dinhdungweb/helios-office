import { Injectable, NotFoundException } from "@nestjs/common";
import { contracts, departments, employees } from "../../common/mock-data";

@Injectable()
export class EmployeesService {
  findAll() {
    return employees;
  }

  findOne(id: string) {
    const employee = employees.find((item) => item.id === id);
    if (!employee) {
      throw new NotFoundException(`Employee ${id} was not found`);
    }
    return employee;
  }

  findDepartments() {
    return departments;
  }

  findContracts() {
    return contracts;
  }

  getOrgChart() {
    return departments.map((department) => ({
      ...department,
      head: employees.find((employee) => employee.id === department.headId) ?? null,
      members: employees.filter((employee) => employee.department === department.name)
    }));
  }
}
