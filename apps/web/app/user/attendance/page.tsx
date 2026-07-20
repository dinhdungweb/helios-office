import { AttendanceBoard } from "@/components/user/attendance-board";
import { UserFrame } from "@/components/user/user-frame";
import { getMyAttendanceData } from "@/lib/attendance-api";

export default async function UserAttendancePage() {
  const data = await getMyAttendanceData();

  return (
    <UserFrame activeModule="attendance">
      <AttendanceBoard data={data} />
    </UserFrame>
  );
}
