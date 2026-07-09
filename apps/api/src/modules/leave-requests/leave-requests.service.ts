import { Injectable } from "@nestjs/common";
import { leaveRequests } from "../../common/mock-data";

@Injectable()
export class LeaveRequestsService {
  findAll() {
    return leaveRequests;
  }
}
