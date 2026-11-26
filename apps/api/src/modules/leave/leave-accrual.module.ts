import { Module } from "@nestjs/common";
import { LeaveBalancesService } from "./leave-balances.service";

// The worker's part of leave (LV-13, LV-14): monthly accrual, carry-over and expiry.
@Module({
  providers: [LeaveBalancesService],
  exports: [LeaveBalancesService]
})
export class LeaveAccrualModule {}
