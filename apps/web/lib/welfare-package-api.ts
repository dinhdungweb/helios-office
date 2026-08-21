import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type WelfarePackageRecord = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  status: "active" | "archived";
  createdAt: string;
  createdBy: { id: string; fullName: string; avatarUrl: string | null } | null;
  position: { id: string; name: string } | null;
  jobTitle: { id: string; name: string } | null;
  jobLevel: { id: string; name: string } | null;
  items: Array<{
    id: string;
    amount: number;
    paymentMethod: string | null;
    benefit: { id: string; name: string } | null;
  }>;
};

export type WelfarePackageData = {
  packages: WelfarePackageRecord[];
  source: "api" | "unavailable";
  error?: string;
};

export async function getWelfarePackageData(): Promise<WelfarePackageData> {
  try {
    const headers = new Headers();
    const accessToken = await getSessionAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${getApiBaseUrl()}/welfare-packages?includeArchived=true`, {
      headers,
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`/welfare-packages returned ${response.status}`);

    return {
      packages: await response.json() as WelfarePackageRecord[],
      source: "api"
    };
  } catch (error) {
    return {
      packages: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach welfare package API"
    };
  }
}
