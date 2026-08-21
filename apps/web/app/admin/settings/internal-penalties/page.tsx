import { InternalPenaltySettingsBoard } from "@/components/admin/internal-penalty-settings-board";
import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { getInternalPenaltyData } from "@/lib/internal-penalty-api";

export default async function InternalPenaltiesSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q?.trim() ?? "";
  const data = await getInternalPenaltyData();

  return (
    <PersonnelSettingsWorkspaceShell
      activeItem="internal-penalty"
      searchAction="/admin/settings/internal-penalties"
      searchDefaultValue={query}
    >
      <InternalPenaltySettingsBoard data={data} query={query} />
    </PersonnelSettingsWorkspaceShell>
  );
}
