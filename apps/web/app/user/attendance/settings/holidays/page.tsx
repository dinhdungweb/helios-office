import { HolidaySettingsBoard } from "@/components/admin/holiday-settings-board";
import { AttendanceSettingsShell } from "@/components/attendance/attendance-settings-shell";
import { getHolidayData } from "@/lib/shift-api";

type HolidaySettingsPageProps = {
  searchParams?: Promise<{ year?: string }>;
};

// Công → Cài đặt → Ngày nghỉ lễ (AT-10).
export default async function AttendanceHolidaySettingsPage({ searchParams }: HolidaySettingsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const requested = Number(params?.year);
  const year = Number.isInteger(requested) && requested >= 2000 && requested <= 2100 ? requested : new Date().getFullYear();
  const data = await getHolidayData(year);

  return (
    <AttendanceSettingsShell activeItem="holidays">
      <HolidaySettingsBoard data={data} />
    </AttendanceSettingsShell>
  );
}
