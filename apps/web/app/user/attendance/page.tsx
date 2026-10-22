import { AttendanceModuleTabs } from "@/components/attendance/attendance-module-tabs";
import { AttendanceBoard } from "@/components/user/attendance-board";
import { UserFrame } from "@/components/user/user-frame";
import { getMyAttendanceData, getMyShiftSchedule, resolveAttendanceMonth } from "@/lib/attendance-api";
import { getAttendanceModuleTabs } from "@/lib/attendance-module";

type UserAttendancePageProps = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function UserAttendancePage({ searchParams }: UserAttendancePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const attendanceMonth = resolveAttendanceMonth(params?.month);
  const [data, schedule, tabs] = await Promise.all([getMyAttendanceData(attendanceMonth), getMyShiftSchedule(attendanceMonth), getAttendanceModuleTabs("personal")]);

  return (
    <UserFrame activeModule="attendance">
      <AttendanceBoard data={data} key={schedule.month} moduleTabs={<AttendanceModuleTabs tabs={tabs} />} schedule={schedule} />
    </UserFrame>
  );
}
