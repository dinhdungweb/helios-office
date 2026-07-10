import { AccountAccessBoard } from "@/components/admin/account-access-board";
import { UserFrame } from "@/components/user/user-frame";

export default function AdminSettingsAccountsPage() {
  return (
    <UserFrame activeModule="admin" showSearch title="Quản trị tài khoản & quyền">
      <AccountAccessBoard />
    </UserFrame>
  );
}
