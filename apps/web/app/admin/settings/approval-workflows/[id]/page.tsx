import { ApprovalWorkflowCreateBoard } from "@/components/admin/approval-workflow-create-board";
import { PersonnelSettingsWorkspaceShell } from "@/components/admin/personnel-settings-workspace-shell";
import { StateBlock } from "@/components/ui/primitives";
import { getApprovalWorkflow } from "@/lib/approval-workflow-api";
import { getEmployeeDirectoryData } from "@/lib/employee-directory-api";
import { getOrgChartData } from "@/lib/org-chart-api";
import { getPositionTitleData } from "@/lib/position-title-api";

// AP-04 → AP-06: edit a workflow in the same designer; saving a changed diagram makes a new version
// while requests already running keep theirs.
export default async function EditApprovalWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [loaded, employeeData, orgChartData, positionTitleData] = await Promise.all([
    getApprovalWorkflow(id),
    getEmployeeDirectoryData(),
    getOrgChartData(),
    getPositionTitleData()
  ]);

  return (
    <PersonnelSettingsWorkspaceShell activeItem="approval" searchAction="/admin/settings/approval-workflows">
      {"error" in loaded ? (
        <StateBlock tone="error" title="Không mở được quy trình">{loaded.error}</StateBlock>
      ) : (
        <>
          <section className="approval-workflow-version-bar" aria-label="Phiên bản quy trình">
            <strong>Phiên bản hiện tại: {loaded.workflow.currentVersion}</strong>
            <span>
              {loaded.versions
                .map((version) => `v${version.version}: ${version.requestCount} đơn`)
                .join(" · ")}
            </span>
            {loaded.workflow.validationErrors.length > 0 ? (
              <span className="approval-workflow-version-warning">Sơ đồ chưa hợp lệ nên chưa kích hoạt được: {loaded.workflow.validationErrors.join(" ")}</span>
            ) : null}
          </section>
          <ApprovalWorkflowCreateBoard
            departments={orgChartData.departments}
            employees={employeeData.employees}
            initial={loaded.workflow}
            key={`${loaded.workflow.id}-${loaded.workflow.currentVersion}`}
            positions={positionTitleData.positions}
            titles={positionTitleData.titles}
          />
        </>
      )}
    </PersonnelSettingsWorkspaceShell>
  );
}
