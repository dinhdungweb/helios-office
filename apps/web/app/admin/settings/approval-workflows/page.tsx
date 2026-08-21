import { ApprovalWorkflowSettingsBoard } from "@/components/admin/approval-workflow-settings-board";
import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { getApprovalWorkflowData } from "@/lib/approval-workflow-api";

export default async function ApprovalWorkflowsSettingsPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const params = searchParams ? await searchParams : undefined;
  const query = params?.q?.trim() ?? "";
  const data = await getApprovalWorkflowData();
  return (
    <PersonnelSettingsWorkspaceShell activeItem="approval" searchAction="/admin/settings/approval-workflows" searchDefaultValue={query}>
      <ApprovalWorkflowSettingsBoard data={data} query={query} />
    </PersonnelSettingsWorkspaceShell>
  );
}
