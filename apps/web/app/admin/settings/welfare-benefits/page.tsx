import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { WelfareBenefitSettingsBoard } from "@/components/admin/welfare-benefit-settings-board";
import { getWelfareBenefitData } from "@/lib/welfare-benefit-api";

export default async function WelfareBenefitsSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q?.trim() ?? "";
  const data = await getWelfareBenefitData();

  return (
    <PersonnelSettingsWorkspaceShell
      activeItem="benefits"
      searchAction="/admin/settings/welfare-benefits"
      searchDefaultValue={query}
    >
      <WelfareBenefitSettingsBoard data={data} query={query} />
    </PersonnelSettingsWorkspaceShell>
  );
}
