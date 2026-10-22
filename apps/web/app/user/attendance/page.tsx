import { AttendanceBoard } from "@/components/user/attendance-board";
import { UserFrame } from "@/components/user/user-frame";
import { getMyAttendanceData, getMyShiftSchedule, resolveAttendanceMonth } from "@/lib/attendance-api";

type UserAttendancePageProps = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function UserAttendancePage({ searchParams }: UserAttendancePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const attendanceMonth = resolveAttendanceMonth(params?.month);
  const [data, schedule] = await Promise.all([getMyAttendanceData(attendanceMonth), getMyShiftSchedule(attendanceMonth)]);

  return (
    <UserFrame activeModule="attendance">
      <AttendanceBoard data={data} key={schedule.month} schedule={schedule} />
    </UserFrame>
  );
}
