import { EmployeeDirectoryBoard } from "@/components/admin/employee-directory-board";
import { UserFrame } from "@/components/user/user-frame";
import { getEmployeeDirectoryData } from "@/lib/employee-directory-api";

export default async function HcnsEmployeeDirectoryPage() {
  const data = await getEmployeeDirectoryData();

  return (
    <UserFrame activeModule="hcns" showSearch title="Hồ sơ nhân sự">
      <EmployeeDirectoryBoard basePath="/hcns/employees" data={data} />
    </UserFrame>
  );
}
