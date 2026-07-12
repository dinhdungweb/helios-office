import { OrgChartSettingsBoard } from "@/components/admin/org-chart-settings-board";
import { UserFrame } from "@/components/user/user-frame";
import { getOrgChartData } from "@/lib/org-chart-api";

export default async function OrgChartSettingsPage() {
  const data = await getOrgChartData();

  return (
    <UserFrame activeModule="admin" showSearch title="Cài đặt sơ đồ tổ chức">
      <OrgChartSettingsBoard data={data} />
    </UserFrame>
  );
}
