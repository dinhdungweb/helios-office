import { redirect } from "next/navigation";
import { AttendanceDevicesBoard } from "@/components/attendance/attendance-devices-board";
import { AttendanceModuleTabs } from "@/components/attendance/attendance-module-tabs";
import { UserFrame } from "@/components/user/user-frame";
import { getDeviceBoardData, type DeviceView } from "@/lib/attendance-device-api";
import { getAttendanceModuleTabs, getDeviceAccess } from "@/lib/attendance-module";

type DevicesPageProps = {
  searchParams?: Promise<{ view?: string; from?: string; to?: string; deviceId?: string; q?: string; status?: string; page?: string }>;
};

// "Công → Máy chấm công" (AT-19/20/21): machines, sync errors and raw punches; each part shows
// only with the permission its API needs.
export default async function AttendanceDevicesPage({ searchParams }: DevicesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const [tabs, access] = await Promise.all([getAttendanceModuleTabs("devices"), getDeviceAccess()]);
  if (!access.logs) redirect("/user/attendance");

  const allowed: DeviceView[] = [...(access.devices ? ["devices" as const] : []), ...(access.errors ? ["errors" as const] : []), "logs"];
  const view = allowed.includes(params?.view as DeviceView) ? (params?.view as DeviceView) : allowed[0];
  const filters = { from: params?.from ?? "", to: params?.to ?? "", deviceId: params?.deviceId ?? "", q: params?.q ?? "", status: params?.status ?? "" };
  const data = await getDeviceBoardData(view, access, { ...filters, page: Math.max(1, Number(params?.page) || 1) });

  return (
    <UserFrame activeModule="attendance" title="Máy chấm công">
      <main className="attendance-board-page" aria-label="Máy chấm công">
        <header className="attendance-module-header">
          <AttendanceModuleTabs tabs={tabs} />
        </header>
        <AttendanceDevicesBoard access={access} data={data} filters={filters} key={`${view}-${filters.q}`} />
      </main>
    </UserFrame>
  );
}
