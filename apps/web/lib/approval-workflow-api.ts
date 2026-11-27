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

// One workflow for the edit page (AP-04, AP-05): settings, the stored diagram and what blocks activation.
export type ApprovalWorkflowDetail = ApprovalWorkflowRecord & {
  followerId: string | null;
  allowAttachmentsAfterApproved: boolean;
  allowDocumentChangesAfterApproved: boolean;
  allowDiscussionAfterApproved: boolean;
  overdueAction: string;
  flowDefinition: Record<string, unknown>;
  currentVersion: number;
  validationErrors: string[];
};

export type ApprovalWorkflowVersionRecord = { id: string; version: number; createdAt: string; createdById: string | null; requestCount: number };

export async function getApprovalWorkflow(id: string): Promise<{ workflow: ApprovalWorkflowDetail; versions: ApprovalWorkflowVersionRecord[] } | { error: string }> {
  try {
    const headers = new Headers();
    const accessToken = await getSessionAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    const [workflow, versions] = await Promise.all([
      fetch(`${getApiBaseUrl()}/approval-workflows/${encodeURIComponent(id)}`, { headers, cache: "no-store" }),
      fetch(`${getApiBaseUrl()}/approval-workflows/${encodeURIComponent(id)}/versions`, { headers, cache: "no-store" })
    ]);
    if (workflow.status === 404) return { error: "Không tìm thấy quy trình duyệt." };
    if (!workflow.ok) return { error: `Không tải được quy trình (${workflow.status}).` };
    return {
      workflow: (await workflow.json()) as ApprovalWorkflowDetail,
      versions: versions.ok ? ((await versions.json()) as ApprovalWorkflowVersionRecord[]) : []
    };
  } catch {
    return { error: "Không kết nối được máy chủ." };
  }
}
