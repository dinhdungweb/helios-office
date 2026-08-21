import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type WelfareBenefitStatus = "active" | "archived";

export type WelfareBenefitRecord = {
  id: string;
  name: string;
  amount: number;
  description: string | null;
  status: WelfareBenefitStatus;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  } | null;
};

export type WelfareBenefitData = {
  benefits: WelfareBenefitRecord[];
  source: "api" | "unavailable";
  error?: string;
};

export async function getWelfareBenefitData(): Promise<WelfareBenefitData> {
  try {
    const headers = new Headers();
    const accessToken = await getSessionAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${getApiBaseUrl()}/welfare-benefits?includeArchived=true`, {
      headers,
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`/welfare-benefits returned ${response.status}`);

    return {
      benefits: await response.json() as WelfareBenefitRecord[],
      source: "api"
    };
  } catch (error) {
    return {
      benefits: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach welfare benefit API"
    };
  }
}
