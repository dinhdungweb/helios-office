import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { LeaveRequestsService } from "./leave-requests.service";

@ApiTags("leave-requests")
@Controller("leave-requests")
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Get()
  @ApiOkResponse({ description: "Leave, OT, and business-trip requests." })
  findAll() {
    return this.leaveRequestsService.findAll();
  }
}
