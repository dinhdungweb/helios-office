import { AttendancePolicyBoard } from "@/components/admin/attendance-policy-board";
import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { getReminderRuns, getShiftSettingsData } from "@/lib/shift-api";

export default async function AttendancePolicyPage() {
  const [data, reminderRuns] = await Promise.all([getShiftSettingsData(), getReminderRuns()]);

  return (
    <PersonnelSettingsWorkspaceShell activeItem="attendance-policy" searchAction="/admin/settings/attendance-policy">
      <AttendancePolicyBoard data={data} reminderRuns={reminderRuns} />
    </PersonnelSettingsWorkspaceShell>
  );
}
