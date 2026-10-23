import { AttendanceLocationBoard } from "@/components/admin/attendance-location-board";
import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { getAttendanceLocationData } from "@/lib/attendance-location-api";

// DV-07: valid places for web/app check-ins.
export default async function AttendanceLocationsPage() {
  const data = await getAttendanceLocationData();

  return (
    <PersonnelSettingsWorkspaceShell activeItem="attendance-location" searchAction="/admin/settings/attendance-locations">
      <AttendanceLocationBoard data={data} />
    </PersonnelSettingsWorkspaceShell>
  );
}
