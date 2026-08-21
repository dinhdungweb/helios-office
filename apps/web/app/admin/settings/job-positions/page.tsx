import { PersonnelCatalogSettingsPage } from "@/components/admin/personnel-catalog-settings-page";

export default async function JobPositionsSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  return <PersonnelCatalogSettingsPage initialKind="position" query={params?.q?.trim() ?? ""} />;
}
