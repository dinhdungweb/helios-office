import { DetailedPermissionSettingsBoard } from "@/components/admin/detailed-permission-settings-board";
import { UserFrame } from "@/components/user/user-frame";

export default function DetailedPermissionSettingsPage() {
  return (
    <UserFrame activeModule="admin" showSearch title="Quyền chi tiết">
      <DetailedPermissionSettingsBoard />
    </UserFrame>
  );
}
