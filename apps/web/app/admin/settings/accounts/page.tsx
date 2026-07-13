import { AdminUserListBoard } from "@/components/admin/admin-user-list-board";
import { UserFrame } from "@/components/user/user-frame";
import { getAccountAccessData } from "@/lib/account-access-api";

export default async function AdminSettingsAccountsPage() {
  const accountAccessData = await getAccountAccessData();

  return (
    <UserFrame activeModule="admin" showSearch title="Danh sách người dùng">
      <AdminUserListBoard data={accountAccessData} />
    </UserFrame>
  );
}
