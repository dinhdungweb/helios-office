import { PersonnelCatalogSettingsPage } from "@/components/admin/personnel-catalog-settings-page";

export default async function JobTitlesSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  return <PersonnelCatalogSettingsPage initialKind="title" query={params?.q?.trim() ?? ""} />;
}
