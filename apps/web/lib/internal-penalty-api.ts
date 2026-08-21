import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type InternalPenaltyStatus = "active" | "archived";

export type InternalPenaltyRecord = {
  id: string;
  violation: string;
  amount: number;
  description: string | null;
  status: InternalPenaltyStatus;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  } | null;
};

export type InternalPenaltyData = {
  penalties: InternalPenaltyRecord[];
  source: "api" | "unavailable";
  error?: string;
};

export async function getInternalPenaltyData(): Promise<InternalPenaltyData> {
  try {
    const headers = new Headers();
    const accessToken = await getSessionAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${getApiBaseUrl()}/internal-penalties?includeArchived=true`, {
      headers,
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`/internal-penalties returned ${response.status}`);

    return {
      penalties: await response.json() as InternalPenaltyRecord[],
      source: "api"
    };
  } catch (error) {
    return {
      penalties: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach internal penalty API"
    };
  }
}
