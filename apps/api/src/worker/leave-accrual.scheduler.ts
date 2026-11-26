import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { LeaveBalancesService } from "../modules/leave/leave-balances.service";

const FIRST_RUN_DELAY_MS = 60_000;
const INTERVAL_MS = 60 * 60_000;

// LV-13 / LV-14: every hour, brings annual leave up to the month's accrual, carries last year's
// days over and expires unused carried-over days. Ledger source keys make reruns harmless.
@Injectable()
export class LeaveAccrualScheduler implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("LeaveAccrual");
  private timers: NodeJS.Timeout[] = [];

  constructor(private readonly balances: LeaveBalancesService) {}

  onModuleInit() {
    this.timers.push(setTimeout(() => void this.run(), FIRST_RUN_DELAY_MS));
    this.timers.push(setInterval(() => void this.run(), INTERVAL_MS));
  }

  onApplicationShutdown() {
    this.timers.forEach((timer) => clearTimeout(timer));
  }

  async run() {
    try {
      const result = await this.balances.tick();
      if (result.accrued + result.carried + result.expired > 0) this.logger.log(`Leave balances: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.warn(`Leave accrual failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}
