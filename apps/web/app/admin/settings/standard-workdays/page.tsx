import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { StandardWorkdayBoard } from "@/components/admin/standard-workday-board";
import { getStandardWorkdayData } from "@/lib/shift-api";

// AT-25: standard work units per group of departments × positions.
export default async function StandardWorkdaysPage() {
  const data = await getStandardWorkdayData();

  return (
    <PersonnelSettingsWorkspaceShell activeItem="standard-workday" searchAction="/admin/settings/standard-workdays">
      <StandardWorkdayBoard data={data} />
    </PersonnelSettingsWorkspaceShell>
  );
}
