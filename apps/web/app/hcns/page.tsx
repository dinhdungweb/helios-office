import { HcnsDashboardBoard } from "@/components/hcns/hcns-dashboard-board";
import { UserFrame } from "@/components/user/user-frame";
import { getCurrentSessionUser } from "@/lib/auth-user";
import { getHcnsDashboardData } from "@/lib/hcns-dashboard-api";

export default async function HcnsDashboardPage() {
  const user = await getCurrentSessionUser();
  const data = await getHcnsDashboardData(user?.account?.effectivePermissionKeys ?? []);

  return (
    <UserFrame activeModule="hcns" showSearch title="Dashboard HCNS">
      <HcnsDashboardBoard data={data} />
    </UserFrame>
  );
}
