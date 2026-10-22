import { AttendanceBoard } from "@/components/user/attendance-board";
import { UserFrame } from "@/components/user/user-frame";
import { getMyAttendanceData, getMyShiftSchedule, resolveAttendanceMonth } from "@/lib/attendance-api";

type UserAttendancePageProps = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function UserAttendancePage({ searchParams }: UserAttendancePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const [data, schedule] = await Promise.all([getMyAttendanceData(), getMyShiftSchedule(resolveAttendanceMonth(params?.month))]);

  return (
    <UserFrame activeModule="attendance">
      <AttendanceBoard data={data} key={schedule.month} schedule={schedule} />
    </UserFrame>
  );
}
