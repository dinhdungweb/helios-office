import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type SmtpSecurity = "none" | "starttls" | "ssl";
export type SmtpSettingStatus = "configured" | "needs_review" | "planned";
export type SmtpTestStatus = "sent" | "failed" | "not_tested";
export type SmtpSyncStatus = "synced" | "failed" | "not_synced";

export type SmtpSettings = {
  enabled: boolean;
  provider: string;
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  passwordSet: boolean;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  dailyLimit: number;
  testRecipient: string;
  status: SmtpSettingStatus;
  missingFields: string[];
  lastTestAt?: string;
  lastTestStatus: SmtpTestStatus;
  lastTestMessage?: string;
  syncedToKeycloakAt?: string;
  keycloakSyncStatus: SmtpSyncStatus;
  keycloakSyncMessage?: string;
};

export type SmtpSettingsPayload = {
  enabled?: boolean;
  provider?: string;
  host?: string;
  port?: number;
  security?: SmtpSecurity;
  username?: string;
  password?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  dailyLimit?: number;
  testRecipient?: string;
};

export type SmtpTestResult = {
  ok: boolean;
  message: string;
  settings: SmtpSettings;
};

export type SmtpSettingsData = {
  settings: SmtpSettings | null;
  source: "api" | "unavailable";
  error?: string;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const accessToken = await getSessionAccessToken();

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Bạn cần đăng nhập bằng tài khoản admin để cấu hình SMTP.");
    }

    if (response.status === 403) {
      throw new Error("Tài khoản hiện tại không có quyền cấu hình SMTP.");
    }

    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getSmtpSettingsData(): Promise<SmtpSettingsData> {
  try {
    return {
      settings: await requestJson<SmtpSettings>("/admin-settings/smtp"),
      source: "api"
    };
  } catch (error) {
    return {
      settings: null,
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach SMTP settings API"
    };
  }
}

export async function updateSmtpSettings(payload: SmtpSettingsPayload) {
  return requestJson<SmtpSettings>("/admin-settings/smtp", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function testSmtpSettings(recipient?: string) {
  return requestJson<SmtpTestResult>("/admin-settings/smtp/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ recipient })
  });
}
