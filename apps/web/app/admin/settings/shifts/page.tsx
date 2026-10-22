import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { ShiftSettingsBoard } from "@/components/admin/shift-settings-board";
import { getShiftSettingsData } from "@/lib/shift-api";

export default async function ShiftSettingsPage() {
  const data = await getShiftSettingsData();

  return (
    <PersonnelSettingsWorkspaceShell activeItem="shift" searchAction="/admin/settings/shifts">
      <ShiftSettingsBoard data={data} />
    </PersonnelSettingsWorkspaceShell>
  );
}
