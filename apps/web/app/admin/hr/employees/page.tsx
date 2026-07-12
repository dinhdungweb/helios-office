import { EmployeeDirectoryBoard } from "@/components/admin/employee-directory-board";
import { UserFrame } from "@/components/user/user-frame";
import { getEmployeeDirectoryData } from "@/lib/employee-directory-api";

export default async function EmployeeDirectoryPage() {
  const data = await getEmployeeDirectoryData();

  return (
    <UserFrame activeModule="admin" showSearch title="Hồ sơ nhân sự">
      <EmployeeDirectoryBoard data={data} />
    </UserFrame>
  );
}
