import type { Route } from "next";
import Link from "next/link";
import { AttendanceModuleTabs } from "@/components/attendance/attendance-module-tabs";
import { UserFrame } from "@/components/user/user-frame";
import { getAttendanceModuleTabs } from "@/lib/attendance-module";
import { CaretLeft } from "@/lib/icons";
import { StandardWorkdayBoard } from "@/components/admin/standard-workday-board";
import { getStandardWorkdayData } from "@/lib/shift-api";

// Công → Bảng chấm công → Công chuẩn (AT-25); 1Office keeps it on the timesheet template.
export default async function TimesheetStandardWorkdaysPage() {
  const [tabs, data] = await Promise.all([getAttendanceModuleTabs("timesheet"), getStandardWorkdayData()]);

  return (
    <UserFrame activeModule="attendance" title="Công chuẩn">
      <main className="attendance-board-page" aria-label="Công chuẩn">
        <header className="attendance-module-header">
          <AttendanceModuleTabs tabs={tabs} />
        </header>
        <Link className="attendance-subpage-back" href={"/user/attendance/timesheet" as Route}>
          <CaretLeft size={16} weight="bold" aria-hidden="true" />
          Bảng chấm công
        </Link>
        <StandardWorkdayBoard data={data} />
      </main>
    </UserFrame>
  );
}
