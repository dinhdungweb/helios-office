import { AttendanceBoard } from "@/components/user/attendance-board";
import { UserFrame } from "@/components/user/user-frame";

export default function UserAttendancePage() {
  return (
    <UserFrame activeModule="attendance">
      <AttendanceBoard />
    </UserFrame>
  );
}
