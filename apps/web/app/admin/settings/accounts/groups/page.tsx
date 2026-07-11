import { UserGroupSettingsBoard } from "@/components/admin/user-group-settings-board";
import { UserFrame } from "@/components/user/user-frame";
import { getAccountAccessData } from "@/lib/account-access-api";

export default async function UserGroupSettingsPage() {
  const accountAccessData = await getAccountAccessData();

  return (
    <UserFrame activeModule="admin" showSearch title="Nhóm người dùng">
      <UserGroupSettingsBoard data={accountAccessData} />
    </UserFrame>
  );
}
