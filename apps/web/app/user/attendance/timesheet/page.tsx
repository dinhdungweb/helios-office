import { AttendanceModuleTabs } from "@/components/attendance/attendance-module-tabs";
import { TimesheetBoard } from "@/components/attendance/timesheet-board";
import { UserFrame } from "@/components/user/user-frame";
import { resolveAttendanceMonth } from "@/lib/attendance-api";
import { canEditAttendance, canLockAttendancePeriods, canManageConfirmation, getAttendanceModuleTabs } from "@/lib/attendance-module";
import { getTimesheetData } from "@/lib/timesheet-api";

type TimesheetPageProps = {
  searchParams?: Promise<{ month?: string; department?: string; q?: string; page?: string }>;
};

// "Công → Bảng chấm công" (AT-16), like 1Office's monthly timesheet; cells open the day for
// details and manual changes (AT-15).
export default async function TimesheetPage({ searchParams }: TimesheetPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const month = resolveAttendanceMonth(params?.month);
  const page = Math.max(1, Number(params?.page) || 1);
  const [data, tabs, canEdit, canLock, canConfirm] = await Promise.all([
    getTimesheetData({ month, departmentId: params?.department, q: params?.q, page }),
    getAttendanceModuleTabs("timesheet"),
    canEditAttendance(),
    canLockAttendancePeriods(),
    canManageConfirmation()
  ]);

  return (
    <UserFrame activeModule="attendance" title="Bảng chấm công">
      <main className="attendance-board-page" aria-label="Bảng chấm công">
        <header className="attendance-module-header">
          <AttendanceModuleTabs tabs={tabs} />
        </header>
        <TimesheetBoard canConfirm={canConfirm} canEdit={canEdit} canLock={canLock} data={data} departmentId={params?.department ?? ""} key={`${month}-${params?.department ?? ""}-${params?.q ?? ""}`} q={params?.q ?? ""} />
      </main>
    </UserFrame>
  );
}
