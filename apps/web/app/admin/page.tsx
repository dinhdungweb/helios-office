import { AdminDashboardBoard } from "@/components/admin/admin-dashboard-board";
import { UserFrame } from "@/components/user/user-frame";
import { getAdminDashboardData } from "@/lib/admin-dashboard-api";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <UserFrame activeModule="admin" showSearch title="Dashboard Admin">
      <AdminDashboardBoard data={data} />
    </UserFrame>
  );
}
