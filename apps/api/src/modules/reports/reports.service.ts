import { Injectable } from "@nestjs/common";
import { reports } from "../../common/mock-data";

@Injectable()
export class ReportsService {
  getExecutiveDashboard() {
    return reports;
  }
}
