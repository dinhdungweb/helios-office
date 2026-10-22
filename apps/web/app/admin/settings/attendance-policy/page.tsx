import { AttendancePolicyBoard } from "@/components/admin/attendance-policy-board";
import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { getShiftSettingsData } from "@/lib/shift-api";

export default async function AttendancePolicyPage() {
  const data = await getShiftSettingsData();

  return (
    <PersonnelSettingsWorkspaceShell activeItem="attendance-policy" searchAction="/admin/settings/attendance-policy">
      <AttendancePolicyBoard data={data} />
    </PersonnelSettingsWorkspaceShell>
  );
}
