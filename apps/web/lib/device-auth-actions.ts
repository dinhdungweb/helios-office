"use server";

import { revalidatePath } from "next/cache";
import {
  deleteDeviceAuthRequest,
  updateDeviceAuthPolicy,
  updateDeviceAuthStatus,
  type DeviceAuthPolicy,
  type DeviceAuthRequest,
  type DeviceAuthStatus
} from "@/lib/device-auth-api";

export type DeviceAuthActionResult =
  | {
      ok: true;
      policy?: DeviceAuthPolicy;
      request?: DeviceAuthRequest;
    }
  | {
      ok: false;
      error: string;
    };

const deviceAuthPath = "/admin/settings/accounts/device-auth";

export async function updateDeviceAuthStatusAction(
  requestId: string,
  status: DeviceAuthStatus
): Promise<DeviceAuthActionResult> {
  try {
    const request = await updateDeviceAuthStatus(requestId, status);
    revalidatePath(deviceAuthPath);

    return { ok: true, request };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không cập nhật được trạng thái thiết bị."
    };
  }
}

export async function deleteDeviceAuthRequestAction(requestId: string): Promise<DeviceAuthActionResult> {
  try {
    await deleteDeviceAuthRequest(requestId);
    revalidatePath(deviceAuthPath);

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không xóa được thiết bị."
    };
  }
}

export async function updateDeviceAuthPolicyAction(policy: DeviceAuthPolicy): Promise<DeviceAuthActionResult> {
  try {
    const updatedPolicy = await updateDeviceAuthPolicy(policy);
    revalidatePath(deviceAuthPath);

    return { ok: true, policy: updatedPolicy };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không lưu được cài đặt xác thực thiết bị."
    };
  }
}
