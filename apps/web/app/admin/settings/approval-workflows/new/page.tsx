import { ApprovalWorkflowCreateBoard } from "@/components/admin/approval-workflow-create-board";
import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { getEmployeeDirectoryData } from "@/lib/employee-directory-api";
import { getOrgChartData } from "@/lib/org-chart-api";
import { getPositionTitleData } from "@/lib/position-title-api";

export default async function NewApprovalWorkflowSettingsPage() {
  const [employeeData, orgChartData, positionTitleData] = await Promise.all([
    getEmployeeDirectoryData(),
    getOrgChartData(),
    getPositionTitleData()
  ]);
  return (
    <PersonnelSettingsWorkspaceShell activeItem="approval" searchAction="/admin/settings/approval-workflows">
      <ApprovalWorkflowCreateBoard
        departments={orgChartData.departments}
        employees={employeeData.employees}
        positions={positionTitleData.positions}
        titles={positionTitleData.titles}
      />
    </PersonnelSettingsWorkspaceShell>
  );
}
