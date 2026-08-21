import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { PositionTitleSettingsBoard } from "@/components/admin/position-title-settings-board";
import { getAccountAccessData } from "@/lib/account-access-api";
import { getPositionTitleData } from "@/lib/position-title-api";

type CatalogKind = "position" | "title" | "level";

const catalogRoutes: Record<CatalogKind, string> = {
  position: "/admin/settings/job-positions",
  title: "/admin/settings/job-titles",
  level: "/admin/settings/job-levels"
};

export async function PersonnelCatalogSettingsPage({
  initialKind,
  query = ""
}: {
  initialKind: CatalogKind;
  query?: string;
}) {
  const [data, accountAccessData] = await Promise.all([
    getPositionTitleData(),
    getAccountAccessData()
  ]);

  return (
    <PersonnelSettingsWorkspaceShell
      activeItem={initialKind === "position" ? "position" : "title"}
      searchAction={catalogRoutes[initialKind]}
      searchDefaultValue={query}
    >
      <PositionTitleSettingsBoard
        data={data}
        initialKind={initialKind}
        permissionGroups={accountAccessData.groups.filter((group) => group.status === "active")}
        query={query}
      />
    </PersonnelSettingsWorkspaceShell>
  );
}
