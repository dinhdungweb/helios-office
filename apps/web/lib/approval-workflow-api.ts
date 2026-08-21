import { getApiBaseUrl } from "@/lib/api-base";
import { getSessionAccessToken } from "@/lib/auth-session";

export type ApprovalWorkflowRecord = {
  id: string;
  code: string | null;
  name: string;
  status: "draft" | "active" | "archived";
  objectType: string;
  subObject: string;
  versionMode: boolean;
  approvalType: string;
  showFlowInObject: boolean;
  createdAt: string;
  updatedAt: string;
  follower: { id: string; fullName: string; avatarUrl: string | null } | null;
  createdBy: { id: string; fullName: string; avatarUrl: string | null } | null;
  updatedBy: { id: string; fullName: string; avatarUrl: string | null } | null;
};

export type ApprovalWorkflowData = {
  workflows: ApprovalWorkflowRecord[];
  source: "api" | "unavailable";
  error?: string;
};

export async function getApprovalWorkflowData(): Promise<ApprovalWorkflowData> {
  try {
    const headers = new Headers();
    const accessToken = await getSessionAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    const response = await fetch(`${getApiBaseUrl()}/approval-workflows?includeArchived=true`, { headers, cache: "no-store" });
    if (!response.ok) throw new Error(`/approval-workflows returned ${response.status}`);
    return { workflows: await response.json() as ApprovalWorkflowRecord[], source: "api" };
  } catch (error) {
    return {
      workflows: [],
      source: "unavailable",
      error: error instanceof Error ? error.message : "Cannot reach approval workflow API"
    };
  }
}
