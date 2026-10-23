import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common";
import type { AttendanceDayStatus } from "@prisma/client";
import { ImportExportRegistry } from "../../common/import-export/import-export.registry";
import type { CellValue, ExportHandler, ExportSheet, SheetColumn, TransferContext } from "../../common/import-export/import-export.types";
import { AttendanceTimesheetService, TIMESHEET_PERMISSIONS, type TimesheetCell } from "./attendance-timesheet.service";

// Monthly timesheet export (AT-18), within the requester's data scope like the timesheet page:
// sheet 1 is the month (one column per day, hours worked, totals); sheet 2 lists every day.

type TimesheetExportParams = { month: string; departmentId?: string };

const WEEKDAYS = ["", "T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const STATUS_LABELS: Record<AttendanceDayStatus, string> = {
  on_time: "Đúng giờ",
  late: "Đi muộn",
  early_leave: "Về sớm",
  late_and_early: "Đi muộn, về sớm",
  missing_checkin: "Thiếu giờ vào",
  missing_checkout: "Thiếu giờ ra",
  absent: "Vắng",
  holiday: "Nghỉ lễ",
  day_off: "Ngày nghỉ"
};
const CONFIRMATION_LABELS = { confirmed: "Đã xác nhận", feedback: "Có phản hồi" } as const;

const round = (value: number) => Math.round(value * 100) / 100;

function vnTime(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(value);
}

// The month sheet's day cell: hours worked as a number HR can sum, or a symbol like on screen.
function dayCell(cell: TimesheetCell): CellValue {
  if (cell.status === null) return cell.shiftCode ? null : "N";
  if (cell.status === "holiday") return "L";
  if (cell.status === "absent") return "X";
  if (cell.status === "day_off") return cell.outsideShiftMinutes > 0 ? round(cell.outsideShiftMinutes / 60) : "N";
  return round(cell.workedMinutes / 60);
}

@Injectable()
export class TimesheetExportHandler implements ExportHandler<TimesheetExportParams>, OnModuleInit {
  readonly type = "attendance-timesheet";
  readonly title = "Bảng chấm công";
  readonly permissionKeys = TIMESHEET_PERMISSIONS;
  // The month sheet's columns depend on the month; see sheets().
  readonly columns: SheetColumn[] = [];

  constructor(
    private readonly timesheets: AttendanceTimesheetService,
    private readonly registry: ImportExportRegistry
  ) {}

  onModuleInit() {
    this.registry.registerExport(this);
  }

  parseParams(params: unknown): TimesheetExportParams {
    const input = (params ?? {}) as Record<string, unknown>;
    if (typeof input.month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) throw new BadRequestException("month must be YYYY-MM");
    if (input.departmentId !== undefined && (typeof input.departmentId !== "string" || !input.departmentId)) {
      throw new BadRequestException("departmentId must be a string");
    }
    return { month: input.month, ...(input.departmentId ? { departmentId: input.departmentId as string } : {}) };
  }

  async rows(params: TimesheetExportParams, context: TransferContext) {
    return (await this.sheets(params, context))[0].rows;
  }

  async sheets(params: TimesheetExportParams, context: TransferContext): Promise<ExportSheet[]> {
    const sheet = await this.timesheets.fullMonth(context.scope, params);
    const label = `${sheet.month.slice(5, 7)}-${sheet.month.slice(0, 4)}`;

    const monthColumns: SheetColumn[] = [
      { key: "index", header: "STT", width: 6 },
      { key: "code", header: "Mã NV", width: 12 },
      { key: "fullName", header: "Họ và tên", width: 26 },
      { key: "department", header: "Phòng ban", width: 22 },
      ...sheet.dates.map((item) => ({ key: `d${item.date.slice(8)}`, header: `${item.date.slice(8)} ${WEEKDAYS[item.weekday]}`, width: 7 })),
      { key: "lateCount", header: "Đi muộn (lần)", width: 10 },
      { key: "lateMinutes", header: "Đi muộn (phút)", width: 10 },
      { key: "earlyCount", header: "Về sớm (lần)", width: 10 },
      { key: "earlyMinutes", header: "Về sớm (phút)", width: 10 },
      { key: "missingPunchCount", header: "Quên chấm", width: 10 },
      { key: "absentDays", header: "Vắng (ngày)", width: 10 },
      { key: "shiftUnits", header: "Công ca", width: 10 },
      { key: "holidayUnits", header: "Công lễ", width: 10 },
      { key: "nightHours", header: "Giờ đêm", width: 10 },
      { key: "outsideHours", header: "Giờ ngoài ca", width: 10 },
      { key: "standardUnits", header: "Công chuẩn", width: 10 },
      { key: "workedHours", header: "Tổng giờ", width: 10 },
      { key: "totalUnits", header: "Tổng công", width: 10 },
      { key: "confirmation", header: "Xác nhận", width: 14 }
    ];
    const monthRows = sheet.items.map((row, index) => ({
      index: index + 1,
      code: row.employee.code,
      fullName: row.employee.fullName,
      department: row.employee.department.name,
      ...Object.fromEntries(row.cells.map((cell) => [`d${cell.date.slice(8)}`, dayCell(cell)])),
      ...row.totals,
      confirmation: row.confirmation ? CONFIRMATION_LABELS[row.confirmation.status] : "Chưa"
    })) as Array<Record<string, CellValue>>;

    const detailColumns: SheetColumn[] = [
      { key: "code", header: "Mã NV", width: 12 },
      { key: "fullName", header: "Họ và tên", width: 26 },
      { key: "department", header: "Phòng ban", width: 22 },
      { key: "date", header: "Ngày", width: 12 },
      { key: "weekday", header: "Thứ", width: 6 },
      { key: "shift", header: "Ca", width: 10 },
      { key: "checkIn", header: "Giờ vào", width: 9 },
      { key: "checkOut", header: "Giờ ra", width: 9 },
      { key: "status", header: "Trạng thái", width: 16 },
      { key: "lateMinutes", header: "Đi muộn (phút)", width: 10 },
      { key: "earlyMinutes", header: "Về sớm (phút)", width: 10 },
      { key: "workedHours", header: "Giờ làm", width: 9 },
      { key: "outsideHours", header: "Giờ ngoài ca", width: 10 },
      { key: "workUnits", header: "Công", width: 8 },
      { key: "holidayUnits", header: "Công lễ", width: 8 },
      { key: "adjusted", header: "Sửa tay", width: 8 },
      { key: "needsExplanation", header: "Cần giải trình", width: 12 }
    ];
    const weekdayOf = new Map(sheet.dates.map((item) => [item.date, WEEKDAYS[item.weekday]]));
    const detailRows = sheet.items.flatMap((row) =>
      row.cells
        .filter((cell) => cell.status !== null)
        .map((cell) => ({
          code: row.employee.code,
          fullName: row.employee.fullName,
          department: row.employee.department.name,
          date: new Date(`${cell.date}T00:00:00.000Z`),
          weekday: weekdayOf.get(cell.date) ?? null,
          shift: cell.shiftCode,
          checkIn: vnTime(cell.checkIn),
          checkOut: vnTime(cell.checkOut),
          status: STATUS_LABELS[cell.status!],
          lateMinutes: cell.lateMinutes || null,
          earlyMinutes: cell.earlyMinutes || null,
          workedHours: round(cell.workedMinutes / 60),
          outsideHours: cell.outsideShiftMinutes ? round(cell.outsideShiftMinutes / 60) : null,
          workUnits: cell.workUnits,
          holidayUnits: cell.paidLeaveUnits || null,
          adjusted: cell.adjusted ? "Có" : null,
          needsExplanation: cell.needsExplanation ? "Có" : null
        }))
    );

    return [
      { title: `Bảng công ${label}`, columns: monthColumns, rows: monthRows },
      { title: "Chi tiết ngày", columns: detailColumns, rows: detailRows }
    ];
  }

  fileName(params: TimesheetExportParams) {
    return `bang-cham-cong-${params.month}.xlsx`;
  }
}
