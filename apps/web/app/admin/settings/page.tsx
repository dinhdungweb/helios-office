import { AdminSettingsBoard } from "@/components/admin/admin-settings-board";
import { UserFrame } from "@/components/user/user-frame";

export default function AdminSettingsPage() {
  return (
    <UserFrame activeModule="admin" showSearch title="Trung tâm quản trị">
      <AdminSettingsBoard />
    </UserFrame>
  );
}
