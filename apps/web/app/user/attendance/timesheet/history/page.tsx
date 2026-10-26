import type { Route } from "next";
import Link from "next/link";
import { AttendanceModuleTabs } from "@/components/attendance/attendance-module-tabs";
import { UserFrame } from "@/components/user/user-frame";
import { getAttendanceModuleTabs } from "@/lib/attendance-module";
import { CaretLeft } from "@/lib/icons";
import { AttendanceRecalcBoard } from "@/components/admin/attendance-recalc-board";
import { getRecalcData } from "@/lib/shift-api";

// Công → Bảng chấm công → Lịch sử (AT-12), like 1Office's Calculate / History on the timesheet toolbar.
export default async function TimesheetHistoryPage() {
  const [tabs, data] = await Promise.all([getAttendanceModuleTabs("timesheet"), getRecalcData()]);

  return (
    <UserFrame activeModule="attendance" title="Lịch sử tính công">
      <main className="attendance-board-page" aria-label="Lịch sử tính công">
        <header className="attendance-module-header">
          <AttendanceModuleTabs tabs={tabs} />
        </header>
        <Link className="attendance-subpage-back" href={"/user/attendance/timesheet" as Route}>
          <CaretLeft size={16} weight="bold" aria-hidden="true" />
          Bảng chấm công
        </Link>
        <AttendanceRecalcBoard data={data} />
      </main>
    </UserFrame>
  );
}
