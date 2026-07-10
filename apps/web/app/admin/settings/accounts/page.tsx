import { AccountAccessBoard } from "@/components/admin/account-access-board";
import { UserFrame } from "@/components/user/user-frame";
import { getAccountAccessData } from "@/lib/account-access-api";

export default async function AdminSettingsAccountsPage() {
  const accountAccessData = await getAccountAccessData();

  return (
    <UserFrame activeModule="admin" showSearch title="Quản trị tài khoản & quyền">
      <AccountAccessBoard data={accountAccessData} />
    </UserFrame>
  );
}
