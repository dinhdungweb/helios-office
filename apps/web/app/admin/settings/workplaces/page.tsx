import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { WorkplaceSettingsBoard } from "@/components/admin/workplace-settings-board";
import { getWorkplaceData } from "@/lib/workplace-api";

export default async function WorkplacesSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q?.trim() ?? "";
  const data = await getWorkplaceData();

  return (
    <PersonnelSettingsWorkspaceShell
      activeItem="workplace"
      searchAction="/admin/settings/workplaces"
      searchDefaultValue={query}
    >
      <WorkplaceSettingsBoard data={data} query={query} />
    </PersonnelSettingsWorkspaceShell>
  );
}
