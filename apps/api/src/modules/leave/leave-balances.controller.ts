import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequireAnyPermission, RequirePermissions } from "../auth/permissions.decorator";
import { BALANCE_VIEW_PERMISSIONS, LEAVE_MANAGE_PERMISSION, LeaveBalancesService } from "./leave-balances.service";
import { AdjustBalanceDto, BalanceQueryDto } from "./leave.dto";

@ApiTags("leave")
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller("leave-balances")
export class LeaveBalancesController {
  constructor(private readonly balances: LeaveBalancesService) {}

  @Get("me")
  @ApiOkResponse({ description: "My leave balances for a year (LV-10)." })
  mine(@CurrentUser() user: AuthenticatedUser, @Query() query: BalanceQueryDto) {
    return this.balances.mine(user, query.year);
  }

  @Get()
  @RequireAnyPermission(...BALANCE_VIEW_PERMISSIONS)
  @ApiOkResponse({ description: "Balances of people in my data scope (LV-11)." })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: BalanceQueryDto) {
    return this.balances.list(user, query);
  }

  @Get(":employeeId/transactions")
  @ApiOkResponse({ description: "Ledger of one person's balances for a year: mine, or someone in scope." })
  transactions(@CurrentUser() user: AuthenticatedUser, @Param("employeeId") employeeId: string, @Query() query: BalanceQueryDto) {
    return this.balances.transactions(user, employeeId, query.year ?? new Date().getFullYear());
  }

  @Post("adjust")
  @RequirePermissions(LEAVE_MANAGE_PERMISSION)
  @ApiOkResponse({ description: "Add or remove days with a reason (LV-12)." })
  adjust(@CurrentUser() user: AuthenticatedUser, @Body() dto: AdjustBalanceDto) {
    return this.balances.adjust(user, dto);
  }
}
