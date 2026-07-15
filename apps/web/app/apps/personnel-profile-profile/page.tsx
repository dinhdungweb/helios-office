import { PersonnelDirectoryBoard } from "@/components/user/personnel-directory-board";
import { UserFrame } from "@/components/user/user-frame";
import { getEmployeeDirectoryData } from "@/lib/employee-directory-api";

export default async function PersonnelProfileDirectoryPage() {
  const data = await getEmployeeDirectoryData();

  return (
    <UserFrame activeModule="hcns-employees" showSearch title="Danh sách nhân sự">
      <PersonnelDirectoryBoard data={data} />
    </UserFrame>
  );
}
