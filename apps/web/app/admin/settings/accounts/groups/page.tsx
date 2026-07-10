import { UserGroupSettingsBoard } from "@/components/admin/user-group-settings-board";
import { UserFrame } from "@/components/user/user-frame";

export default function UserGroupSettingsPage() {
  return (
    <UserFrame activeModule="admin" showSearch title="Nhóm người dùng">
      <UserGroupSettingsBoard />
    </UserFrame>
  );
}
