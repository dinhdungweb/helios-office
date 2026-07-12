import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type AdminSettingStatus = "configured" | "needs_review" | "planned";
export type AdminSettingTier = "system" | "module" | "operations";

export type AdminSettingItem = {
  id: string;
  tier: AdminSettingTier;
  category: string;
  title: string;
  summary: string;
  owner: string;
  status: AdminSettingStatus;
  href?: string;
  controls: string[];
};

export type AdminModuleSettingGroup = {
  id: string;
  module: "HRM" | "WORK" | "CRM";
  summary: string;
  status: AdminSettingStatus;
  settings: AdminSettingItem[];
};

export type AdminOperationEvent = {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  severity: "info" | "warning" | "critical";
};

export type AdminSettingsOverview = {
  totalSettings: number;
  configured: number;
  needsReview: number;
  planned: number;
  systemSettings: number;
  moduleSettings: number;
  operationSettings: number;
  activeUsers: number;
};

export type AdminSettingsPayload = {
  overview: AdminSettingsOverview;
  system: AdminSettingItem[];
  modules: AdminModuleSettingGroup[];
  operations: AdminSettingItem[];
  events: AdminOperationEvent[];
};

export type AdminSettingsData = {
  data: AdminSettingsPayload | null;
  source: "api" | "unavailable";
  error?: string;
};

export type CompanyInfoStatus = "complete" | "review" | "missing";

export type CompanyInfoItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: CompanyInfoStatus;
};

export type CompanyOffice = {
  id: string;
  name: string;
  type: "headquarters" | "office";
  address: string;
  note: string;
};

export type CompanyBankAccount = {
  id: string;
  accountNumber: string;
  bankName: string;
  branch: string;
  owner: string;
  isDefault: boolean;
};

export type CompanyLegalAsset = {
  id: string;
  name: string;
  fileName: string;
  usage: string;
  status: CompanyInfoStatus;
};

export type CompanyInfoSettings = {
  identityInfo: CompanyInfoItem[];
  contactInfo: CompanyInfoItem[];
  offices: CompanyOffice[];
  legalRepresentative: CompanyInfoItem[];
  bankAccounts: CompanyBankAccount[];
  generalConfig: CompanyInfoItem[];
  legalAssets: CompanyLegalAsset[];
  status: AdminSettingStatus;
};

export type CompanyInfoSettingsData = {
  settings: CompanyInfoSettings | null;
  source: "api" | "unavailable";
  error?: string;
};

export type CompanyInfoPayload = {
  companyName?: string;
  shortName?: string;
  taxCode?: string;
  website?: string;
  hotline?: string;
  email?: string;
  headOffice?: string;
  representativeName?: string;
  representativeTitle?: string;
  fiscalYear?: string;
  industry?: string;
  templateSync?: string;
};

export type IntranetSettingStatus = "enabled" | "disabled" | "review";

export type IntranetBrandAsset = {
  id: string;
  label: string;
  target: string;
  value: string;
  recommendation: string;
  status: IntranetSettingStatus;
};

export type IntranetPolicyItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: IntranetSettingStatus;
};

export type IntranetTemplateItem = {
  id: string;
  name: string;
  target: string;
  status: IntranetSettingStatus;
};

export type IntranetTagItem = {
  id: string;
  label: string;
  usage: number;
  status: IntranetSettingStatus;
};

export type IntranetCultureMode = {
  id: "serious" | "engagement" | "open";
  label: string;
  body: string;
  active: boolean;
};

export type IntranetSettings = {
  brandAssets: IntranetBrandAsset[];
  newsfeedPolicies: IntranetPolicyItem[];
  privacySettings: IntranetPolicyItem[];
  recognitionTemplates: IntranetTemplateItem[];
  tags: IntranetTagItem[];
  reactions: IntranetPolicyItem[];
  communicationSettings: IntranetPolicyItem[];
  cultureModes: IntranetCultureMode[];
  status: AdminSettingStatus;
};

export type IntranetSettingsData = {
  settings: IntranetSettings | null;
  source: "api" | "unavailable";
  error?: string;
};

export type IntranetSettingsPayload = {
  cultureMode?: "serious" | "engagement" | "open";
  brandColor?: string;
  postPermission?: string;
  postApprovalStatus?: IntranetSettingStatus;
  phoneVisibility?: string;
  pushNewPost?: string;
  chatGroupPublic?: string;
};

export type ModuleConfigPayload = {
  moduleId: string;
  enabled: boolean;
  enabledSettingIds?: string[];
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
      throw new Error("Bạn cần đăng nhập bằng tài khoản admin để cấu hình hệ thống.");
    }

    if (response.status === 403) {
      throw new Error("Tài khoản hiện tại không có quyền cấu hình hệ thống.");
    }

    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function readData<T>(path: string, fallbackError: string): Promise<{ value: T | null; source: "api" | "unavailable"; error?: string }> {
  try {
    return {
      value: await requestJson<T>(path),
      source: "api"
    };
  } catch (error) {
    return {
      value: null,
      source: "unavailable",
      error: error instanceof Error ? error.message : fallbackError
    };
  }
}

export async function getAdminSettingsData(): Promise<AdminSettingsData> {
  const result = await readData<AdminSettingsPayload>("/admin-settings", "Cannot reach admin settings API");

  return {
    data: result.value,
    source: result.source,
    error: result.error
  };
}

export async function getCompanyInfoSettingsData(): Promise<CompanyInfoSettingsData> {
  const result = await readData<CompanyInfoSettings>("/admin-settings/company-info", "Cannot reach company settings API");

  return {
    settings: result.value,
    source: result.source,
    error: result.error
  };
}

export async function updateCompanyInfoSettings(payload: CompanyInfoPayload) {
  return requestJson<CompanyInfoSettings>("/admin-settings/company-info", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function getIntranetSettingsData(): Promise<IntranetSettingsData> {
  const result = await readData<IntranetSettings>("/admin-settings/intranet", "Cannot reach intranet settings API");

  return {
    settings: result.value,
    source: result.source,
    error: result.error
  };
}

export async function updateIntranetSettings(payload: IntranetSettingsPayload) {
  return requestJson<IntranetSettings>("/admin-settings/intranet", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function updateModuleConfig(payload: ModuleConfigPayload) {
  return requestJson<AdminSettingsPayload>("/admin-settings/module-config", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}
