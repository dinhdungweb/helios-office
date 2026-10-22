import { AttendanceRecalcBoard } from "@/components/admin/attendance-recalc-board";
import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { getRecalcData } from "@/lib/shift-api";

export default async function AttendanceRecalcPage() {
  const data = await getRecalcData();

  return (
    <PersonnelSettingsWorkspaceShell activeItem="attendance-recalc" searchAction="/admin/settings/attendance-recalc">
      <AttendanceRecalcBoard data={data} />
    </PersonnelSettingsWorkspaceShell>
  );
}
