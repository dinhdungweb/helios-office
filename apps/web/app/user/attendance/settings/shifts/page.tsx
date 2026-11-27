import { AttendanceSettingsShell } from "@/components/attendance/attendance-settings-shell";
import { ShiftPatternBoard } from "@/components/admin/shift-pattern-board";
import { ShiftSettingsBoard } from "@/components/admin/shift-settings-board";
import { getShiftPatterns, getShiftSettingsData } from "@/lib/shift-api";

// Công → Cài đặt → Ca làm việc (AT-05, AT-08, AT-29).
export default async function AttendanceShiftSettingsPage() {
  const [data, patterns] = await Promise.all([getShiftSettingsData(), getShiftPatterns()]);

  return (
    <AttendanceSettingsShell activeItem="shifts">
      <ShiftSettingsBoard data={data} />
      {data.source === "api" ? <ShiftPatternBoard data={patterns} shifts={data.shifts} /> : null}
    </AttendanceSettingsShell>
  );
}
