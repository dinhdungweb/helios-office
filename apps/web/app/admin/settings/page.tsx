import { AdminSettingsRoute } from "@/components/admin/admin-settings-route";
import { UserFrame } from "@/components/user/user-frame";
import { getAdminSettingsData } from "@/lib/admin-settings-api";

export default async function AdminSettingsPage() {
  const data = await getAdminSettingsData();

  return (
    <UserFrame activeModule="admin" title="Trung tâm cài đặt">
      <AdminSettingsRoute data={data} />
    </UserFrame>
  );
}
