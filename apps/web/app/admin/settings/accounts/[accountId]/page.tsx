import { notFound } from "next/navigation";
import { AdminUserDetailBoard } from "@/components/admin/admin-user-detail-board";
import { UserFrame } from "@/components/user/user-frame";
import { getAccountAccessData } from "@/lib/account-access-api";
import { getDeviceAuthData } from "@/lib/device-auth-api";
import { getAccountLoginHistory } from "@/lib/login-activity-api";

type AdminUserDetailPageProps = {
  params: Promise<{
    accountId: string;
  }>;
};

function titleForAccount(account: { employeeCode?: string; email: string }) {
  return account.employeeCode ?? (account.email.includes("@") ? account.email.split("@")[0] : account.email);
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const { accountId } = await params;
  const decodedAccountId = decodeURIComponent(accountId);
  const [accountAccessData, deviceAuthData] = await Promise.all([getAccountAccessData(), getDeviceAuthData()]);
  const account = accountAccessData.accounts.find(
    (item) => item.id === decodedAccountId || item.employeeCode === decodedAccountId
  );

  if (!account || account.role === "system_admin") {
    notFound();
  }

  // The URL may carry the employee code; the history API wants the account id.
  const loginHistory = await getAccountLoginHistory(account.id).catch(() => null);

  return (
    <UserFrame activeModule="admin" showSearch title={titleForAccount(account)}>
      <AdminUserDetailBoard
        account={account}
        data={accountAccessData}
        deviceRequests={deviceAuthData.requests}
        loginHistory={loginHistory}
      />
    </UserFrame>
  );
}
