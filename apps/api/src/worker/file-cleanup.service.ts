import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { FilesService } from "../common/files/files.service";

const FIRST_RUN_DELAY_MS = 60_000;
const INTERVAL_MS = 60 * 60_000;

// CORE-12: hourly removal of uploads left pending for more than 24 h. Runs in the worker; the
// per-row claim in FilesService.purgeStalePending keeps it safe if several workers run it.
@Injectable()
export class FileCleanupService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("FileCleanup");
  private timers: NodeJS.Timeout[] = [];

  constructor(private readonly files: FilesService) {}

  onModuleInit() {
    this.timers.push(setTimeout(() => void this.run(), FIRST_RUN_DELAY_MS));
    this.timers.push(setInterval(() => void this.run(), INTERVAL_MS));
  }

  onApplicationShutdown() {
    this.timers.forEach((timer) => clearTimeout(timer));
  }

  async run() {
    try {
      const { purged } = await this.files.purgeStalePending();
      if (purged > 0) this.logger.log(`Removed ${purged} upload(s) left pending over 24 h`);
    } catch (error) {
      this.logger.warn(`Pending upload cleanup failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}
