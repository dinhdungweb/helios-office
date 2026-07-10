import { OrgChartSettingsBoard } from "@/components/admin/org-chart-settings-board";
import { UserFrame } from "@/components/user/user-frame";

export default function OrgChartSettingsPage() {
  return (
    <UserFrame activeModule="admin" showSearch title="Cài đặt sơ đồ tổ chức">
      <OrgChartSettingsBoard />
    </UserFrame>
  );
}
