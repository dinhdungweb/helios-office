import { DetailedPermissionSettingsBoard } from "@/components/admin/detailed-permission-settings-board";
import { UserFrame } from "@/components/user/user-frame";
import { getAccountAccessData } from "@/lib/account-access-api";

export default async function DetailedPermissionSettingsPage() {
  const data = await getAccountAccessData();

  return (
    <UserFrame activeModule="admin" showSearch title="Quyền chi tiết">
      <DetailedPermissionSettingsBoard data={data} />
    </UserFrame>
  );
}
