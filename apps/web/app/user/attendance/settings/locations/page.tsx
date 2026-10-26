import { AttendanceLocationBoard } from "@/components/admin/attendance-location-board";
import { AttendanceSettingsShell } from "@/components/attendance/attendance-settings-shell";
import { getAttendanceLocationData } from "@/lib/attendance-location-api";

// Công → Cài đặt → Chấm công GPS/Wifi (DV-07).
export default async function AttendanceLocationSettingsPage() {
  const data = await getAttendanceLocationData();

  return (
    <AttendanceSettingsShell activeItem="locations">
      <AttendanceLocationBoard data={data} />
    </AttendanceSettingsShell>
  );
}
