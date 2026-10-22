import { Injectable, OnModuleInit } from "@nestjs/common";
import { ATTENDANCE_RECALC_QUEUE } from "../common/queue/queue.constants";
import { AttendanceRecalcService, type RecalcJobData } from "../modules/attendance/attendance-recalc.service";
import { WorkerRuntime } from "./worker-runtime.service";

// Runs queued attendance recalculations (AT-12). One at a time: a job may cover everyone for months.
@Injectable()
export class AttendanceRecalcProcessor implements OnModuleInit {
  constructor(
    private readonly runtime: WorkerRuntime,
    private readonly recalc: AttendanceRecalcService
  ) {}

  onModuleInit() {
    this.runtime.register<RecalcJobData>(ATTENDANCE_RECALC_QUEUE, (job) => this.recalc.run(job.data.jobId), 1);
  }
}
