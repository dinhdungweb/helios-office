import { AttendancePolicyBoard } from "@/components/admin/attendance-policy-board";
import { AttendanceSettingsShell } from "@/components/attendance/attendance-settings-shell";
import { getCheckInPolicy } from "@/lib/device-auth-api";
import { getReminderRuns, getShiftSettingsData } from "@/lib/shift-api";

// Công → Cài đặt → Cài đặt đối tượng → Chấm công, like 1Office's "Timekeeping settings": the
// calculation rules, the general settings, GPS / Wifi check-in rules and reminders on one page.
export default async function AttendanceTimekeepingSettingsPage() {
  const [data, reminderRuns, checkIn] = await Promise.all([getShiftSettingsData(), getReminderRuns(), getCheckInPolicy()]);

  return (
    <AttendanceSettingsShell activeItem="timekeeping">
      <AttendancePolicyBoard checkIn={checkIn} data={data} reminderRuns={reminderRuns} />
    </AttendanceSettingsShell>
  );
}
