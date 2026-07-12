import { PositionTitleSettingsBoard } from "@/components/admin/position-title-settings-board";
import { UserFrame } from "@/components/user/user-frame";
import { getPositionTitleData } from "@/lib/position-title-api";

export default async function PositionTitleSettingsPage() {
  const data = await getPositionTitleData();

  return (
    <UserFrame activeModule="admin" showSearch title="Cài đặt vị trí & chức danh">
      <PositionTitleSettingsBoard data={data} />
    </UserFrame>
  );
}
