import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { ShiftPatternBoard } from "@/components/admin/shift-pattern-board";
import { ShiftSettingsBoard } from "@/components/admin/shift-settings-board";
import { getShiftPatterns, getShiftSettingsData } from "@/lib/shift-api";

export default async function ShiftSettingsPage() {
  const [data, patterns] = await Promise.all([getShiftSettingsData(), getShiftPatterns()]);

  return (
    <PersonnelSettingsWorkspaceShell activeItem="shift" searchAction="/admin/settings/shifts">
      <ShiftSettingsBoard data={data} />
      {data.source === "api" ? <ShiftPatternBoard data={patterns} shifts={data.shifts} /> : null}
    </PersonnelSettingsWorkspaceShell>
  );
}
