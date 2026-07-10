import { DeviceAuthSettingsBoard } from "@/components/admin/device-auth-settings-board";
import { UserFrame } from "@/components/user/user-frame";

export default function DeviceAuthSettingsPage() {
  return (
    <UserFrame activeModule="admin" showSearch title="Xác thực thiết bị">
      <DeviceAuthSettingsBoard />
    </UserFrame>
  );
}
