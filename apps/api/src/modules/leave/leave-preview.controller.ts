import { BadRequestException, Body, Controller, ForbiddenException, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { LeaveBalancesService } from "./leave-balances.service";
import { LeaveRequestHandler } from "./leave-request.handler";
import { unitsByYear } from "./leave-rules";
import { PreviewLeaveDto } from "./leave.dto";

// The leave form asks how many days a request takes and what would be left before sending (LV-15).
// Same checks as creating the request, nothing is saved.
@ApiTags("leave")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("leave-requests")
export class LeavePreviewController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly handler: LeaveRequestHandler,
    private readonly balances: LeaveBalancesService
  ) {}

  @Post("preview")
  @ApiOkResponse({ description: "Days a leave request would take, per date, and the balance left; 400 with the reason when it cannot be sent." })
  async preview(@CurrentUser() user: AuthenticatedUser, @Body() dto: PreviewLeaveDto) {
    const employeeId = user.account?.employeeId;
    if (!employeeId) throw new ForbiddenException("Tài khoản chưa gắn hồ sơ nhân sự.");
    const { payload, summary } = await this.prisma.$transaction((tx) => this.handler.prepare(dto, { tx, requesterId: employeeId, requestId: dto.requestId }));
    const leaveType = await this.prisma.leaveType.findUnique({ where: { code: payload.leaveTypeCode } });
    if (!leaveType) throw new BadRequestException("Loại nghỉ không tồn tại.");
    const remaining = payload.deductsBalance
      ? await Promise.all(
          [...unitsByYear(payload.days)].map(async ([year, amount]) => {
            const available = await this.balances.available(this.prisma, employeeId, leaveType.id, year);
            return { year, available, afterRequest: Math.round((available - amount) * 100) / 100 };
          })
        )
      : [];
    return { total: summary.quantity, days: payload.days, deductsBalance: payload.deductsBalance, remaining };
  }
}
