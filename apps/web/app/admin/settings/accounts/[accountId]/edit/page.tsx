import { notFound } from "next/navigation";
import { AdminUserEditBoard } from "@/components/admin/admin-user-edit-board";
import { UserFrame } from "@/components/user/user-frame";
import { getAccountAccessData } from "@/lib/account-access-api";

type AdminUserEditPageProps = {
  params: Promise<{
    accountId: string;
  }>;
};

export default async function AdminUserEditPage({ params }: AdminUserEditPageProps) {
  const { accountId } = await params;
  const decodedAccountId = decodeURIComponent(accountId);
  const accountAccessData = await getAccountAccessData();
  const account = accountAccessData.accounts.find(
    (item) => item.id === decodedAccountId || item.employeeCode === decodedAccountId
  );

  if (!account || account.role === "system_admin") {
    notFound();
  }

  return (
    <UserFrame activeModule="admin" showSearch title="Sửa tài khoản">
      <AdminUserEditBoard account={account} data={accountAccessData} />
    </UserFrame>
  );
}
