import { IntranetSettingsBoard } from "@/components/admin/intranet-settings-board";
import { UserFrame } from "@/components/user/user-frame";

export default function IntranetSettingsPage() {
  return (
    <UserFrame activeModule="admin" showSearch title="Mạng nội bộ">
      <IntranetSettingsBoard />
    </UserFrame>
  );
}
