import { PositionTitleSettingsBoard } from "@/components/admin/position-title-settings-board";
import { UserFrame } from "@/components/user/user-frame";

export default function PositionTitleSettingsPage() {
  return (
    <UserFrame activeModule="admin" showSearch title="Cài đặt vị trí & chức vụ">
      <PositionTitleSettingsBoard />
    </UserFrame>
  );
}
