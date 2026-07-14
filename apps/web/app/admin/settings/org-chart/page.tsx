import { DepartmentCanvasBoard } from "@/components/admin/department-canvas-board";
import { DepartmentDirectoryBoard } from "@/components/admin/department-directory-board";
import { UserFrame } from "@/components/user/user-frame";
import { getOrgChartData } from "@/lib/org-chart-api";

type OrgChartSettingsPageProps = {
  searchParams?: Promise<{
    view?: string | string[];
  }>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrgChartSettingsPage({ searchParams }: OrgChartSettingsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const isChartView = firstParam(params?.view) === "chart";
  const data = await getOrgChartData();

  return (
    <UserFrame activeModule="admin" showSearch title="Danh sách phòng ban">
      {isChartView ? <DepartmentCanvasBoard data={data} /> : <DepartmentDirectoryBoard data={data} />}
    </UserFrame>
  );
}
