import { AdminSettingsBoard } from "@/components/admin/admin-settings-board";
import { UserFrame } from "@/components/user/user-frame";
import { getAdminSettingsData } from "@/lib/admin-settings-api";

export default async function AdminSettingsPage() {
  const data = await getAdminSettingsData();

  return (
    <UserFrame activeModule="admin" showSearch title="Trung tâm quản trị">
      <AdminSettingsBoard data={data} />
    </UserFrame>
  );
}
