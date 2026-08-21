import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { WelfarePackageSettingsBoard } from "@/components/admin/welfare-package-settings-board";
import { getPositionTitleData } from "@/lib/position-title-api";
import { getWelfareBenefitData } from "@/lib/welfare-benefit-api";
import { getWelfarePackageData } from "@/lib/welfare-package-api";

export default async function WelfarePackagesSettingsPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q?.trim() ?? "";
  const [data, positionTitleData, benefitData] = await Promise.all([
    getWelfarePackageData(),
    getPositionTitleData(),
    getWelfareBenefitData()
  ]);

  return (
    <PersonnelSettingsWorkspaceShell
      activeItem="benefits"
      searchAction="/admin/settings/welfare-packages"
      searchDefaultValue={query}
    >
      <WelfarePackageSettingsBoard
        data={data}
        query={query}
        catalog={{
          positions: positionTitleData.positions,
          titles: positionTitleData.titles,
          levels: positionTitleData.levels,
          benefits: benefitData.benefits
        }}
      />
    </PersonnelSettingsWorkspaceShell>
  );
}
