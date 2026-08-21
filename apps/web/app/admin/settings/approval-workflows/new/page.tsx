import { ApprovalWorkflowCreateBoard } from "@/components/admin/approval-workflow-create-board";
import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { getEmployeeDirectoryData } from "@/lib/employee-directory-api";

export default async function NewApprovalWorkflowSettingsPage() {
  const employeeData = await getEmployeeDirectoryData();
  return (
    <PersonnelSettingsWorkspaceShell activeItem="approval" searchAction="/admin/settings/approval-workflows">
      <ApprovalWorkflowCreateBoard employees={employeeData.employees} />
    </PersonnelSettingsWorkspaceShell>
  );
}
