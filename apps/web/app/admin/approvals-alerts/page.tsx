import { AdminApprovalAlertsBoard } from "@/components/admin/admin-approval-alerts-board";
import { UserFrame } from "@/components/user/user-frame";
import { getAdminApprovalAlertsData } from "@/lib/admin-approval-alerts-api";

export default async function AdminApprovalAlertsPage() {
  const data = await getAdminApprovalAlertsData();

  return (
    <UserFrame activeModule="admin" showSearch title="Phê duyệt & cảnh báo">
      <AdminApprovalAlertsBoard data={data} />
    </UserFrame>
  );
}
