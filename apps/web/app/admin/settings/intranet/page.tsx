import { IntranetSettingsBoard } from "@/components/admin/intranet-settings-board";
import { UserFrame } from "@/components/user/user-frame";
import { getIntranetSettingsData } from "@/lib/admin-settings-api";

export default async function IntranetSettingsPage() {
  const data = await getIntranetSettingsData();

  return (
    <UserFrame activeModule="admin" showSearch title="Mạng nội bộ">
      <IntranetSettingsBoard data={data} />
    </UserFrame>
  );
}
