import { HolidaySettingsBoard } from "@/components/admin/holiday-settings-board";
import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { getHolidayData } from "@/lib/shift-api";

type HolidaysPageProps = {
  searchParams?: Promise<{ year?: string }>;
};

export default async function HolidaysPage({ searchParams }: HolidaysPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const requested = Number(params?.year);
  const year = Number.isInteger(requested) && requested >= 2000 && requested <= 2100 ? requested : new Date().getFullYear();
  const data = await getHolidayData(year);

  return (
    <PersonnelSettingsWorkspaceShell activeItem="holiday" searchAction="/admin/settings/holidays">
      <HolidaySettingsBoard data={data} />
    </PersonnelSettingsWorkspaceShell>
  );
}
