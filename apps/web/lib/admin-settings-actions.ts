"use server";

import { revalidatePath } from "next/cache";
import {
  updateCompanyInfoSettings,
  updateIntranetSettings,
  updateModuleConfig,
  type IntranetSettingStatus
} from "@/lib/admin-settings-api";

export type AdminSettingsFormState = {
  ok: boolean;
  message?: string;
  error?: string;
};

const initialError = "Không lưu được cấu hình.";

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function readCultureMode(formData: FormData) {
  const value = readOptionalString(formData, "cultureMode");

  if (value === "engagement" || value === "open") {
    return value;
  }

  return "serious";
}

function readIntranetStatus(formData: FormData, key: string): IntranetSettingStatus | undefined {
  const value = readOptionalString(formData, key);

  if (value === "enabled" || value === "disabled" || value === "review") {
    return value;
  }

  return undefined;
}

export async function updateCompanyInfoAction(
  _state: AdminSettingsFormState,
  formData: FormData
): Promise<AdminSettingsFormState> {
  try {
    await updateCompanyInfoSettings({
      companyName: readOptionalString(formData, "companyName"),
      shortName: readOptionalString(formData, "shortName"),
      taxCode: readOptionalString(formData, "taxCode"),
      website: readOptionalString(formData, "website"),
      hotline: readOptionalString(formData, "hotline"),
      email: readOptionalString(formData, "email"),
      headOffice: readOptionalString(formData, "headOffice"),
      representativeName: readOptionalString(formData, "representativeName"),
      representativeTitle: readOptionalString(formData, "representativeTitle"),
      fiscalYear: readOptionalString(formData, "fiscalYear"),
      industry: readOptionalString(formData, "industry"),
      templateSync: readOptionalString(formData, "templateSync")
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/settings/company-info");

    return {
      ok: true,
      message: "Đã lưu thông tin doanh nghiệp."
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : initialError
    };
  }
}

export async function updateIntranetSettingsAction(
  _state: AdminSettingsFormState,
  formData: FormData
): Promise<AdminSettingsFormState> {
  try {
    await updateIntranetSettings({
      cultureMode: readCultureMode(formData),
      brandColor: readOptionalString(formData, "brandColor"),
      postPermission: readOptionalString(formData, "postPermission"),
      postApprovalStatus: readIntranetStatus(formData, "postApprovalStatus"),
      phoneVisibility: readOptionalString(formData, "phoneVisibility"),
      pushNewPost: readOptionalString(formData, "pushNewPost"),
      chatGroupPublic: readOptionalString(formData, "chatGroupPublic")
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/settings/intranet");

    return {
      ok: true,
      message: "Đã lưu cấu hình mạng nội bộ."
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : initialError
    };
  }
}

export async function updateModuleConfigAction(
  _state: AdminSettingsFormState,
  formData: FormData
): Promise<AdminSettingsFormState> {
  try {
    const moduleId = readOptionalString(formData, "moduleId");

    if (!moduleId) {
      throw new Error("Thiếu mã phân hệ.");
    }

    await updateModuleConfig({
      moduleId,
      enabled: readBoolean(formData, "enabled")
    });
    revalidatePath("/admin/settings");

    return {
      ok: true,
      message: "Đã lưu trạng thái phân hệ."
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : initialError
    };
  }
}
