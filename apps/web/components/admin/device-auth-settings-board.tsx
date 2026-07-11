import { DeviceAuthSettingsClient } from "@/components/admin/device-auth-settings-client";
import { getDeviceAuthData } from "@/lib/device-auth-api";

export async function DeviceAuthSettingsBoard() {
  const data = await getDeviceAuthData();

  return <DeviceAuthSettingsClient data={data} />;
}
