import { redirect } from "next/navigation";
import { LeaveTypesSettingsBoard } from "@/components/user/leave-types-settings-board";
import { RequestModuleTabs } from "@/components/user/request-module-tabs";
import { UserFrame } from "@/components/user/user-frame";
import { getLeaveTypes, getRequestAccess } from "@/lib/request-api";

export default async function LeaveTypesSettingsPage() {
  const access = await getRequestAccess();
  if (!access.canManageLeave) redirect("/user/requests");
  const leaveTypes = await getLeaveTypes(true);

  return (
    <UserFrame activeModule="requests" showSearch title="Cài đặt đơn từ">
      <LeaveTypesSettingsBoard error={leaveTypes.ok ? undefined : leaveTypes.error} leaveTypes={leaveTypes.ok ? leaveTypes.data : []} moduleTabs={<RequestModuleTabs active="settings" />} />
    </UserFrame>
  );
}
