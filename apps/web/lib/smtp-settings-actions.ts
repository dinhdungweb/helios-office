"use server";

import { revalidatePath } from "next/cache";
import {
  testSmtpSettings,
  updateSmtpSettings,
  type SmtpSecurity
} from "@/lib/smtp-settings-api";

export type SmtpFormState = {
  ok: boolean;
  message?: string;
  error?: string;
};

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

function readNumber(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);
  return value ? Number(value) : undefined;
}

function readSecurity(formData: FormData): SmtpSecurity {
  const value = readOptionalString(formData, "security");

  if (value === "none" || value === "ssl") {
    return value;
  }

  return "starttls";
}

export async function updateSmtpSettingsAction(_state: SmtpFormState, formData: FormData): Promise<SmtpFormState> {
  try {
    await updateSmtpSettings({
      enabled: readBoolean(formData, "enabled"),
      provider: readOptionalString(formData, "provider"),
      host: readOptionalString(formData, "host"),
      port: readNumber(formData, "port"),
      security: readSecurity(formData),
      username: readOptionalString(formData, "username"),
      password: readOptionalString(formData, "password"),
      fromEmail: readOptionalString(formData, "fromEmail"),
      fromName: readOptionalString(formData, "fromName"),
      replyTo: readOptionalString(formData, "replyTo"),
      dailyLimit: readNumber(formData, "dailyLimit"),
      testRecipient: readOptionalString(formData, "testRecipient")
    });
    revalidatePath("/admin/settings/smtp");
    revalidatePath("/admin/settings/accounts");

    return {
      ok: true,
      message: "Đã lưu cấu hình SMTP."
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không lưu được cấu hình SMTP."
    };
  }
}

export async function testSmtpSettingsAction(_state: SmtpFormState, formData: FormData): Promise<SmtpFormState> {
  try {
    const result = await testSmtpSettings(readOptionalString(formData, "recipient"));
    revalidatePath("/admin/settings/smtp");

    return {
      ok: result.ok,
      message: result.message,
      error: result.ok ? undefined : result.message
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không gửi được email thử."
    };
  }
}
