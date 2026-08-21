import { PersonnelCatalogSettingsPage } from "@/components/admin/personnel-catalog-settings-page";

export default async function JobLevelsSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  return <PersonnelCatalogSettingsPage initialKind="level" query={params?.q?.trim() ?? ""} />;
}
