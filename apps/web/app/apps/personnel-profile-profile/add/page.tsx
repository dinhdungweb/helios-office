import { PersonnelProfileCreateBoard } from "@/components/user/personnel-profile-create-board";
import { UserFrame } from "@/components/user/user-frame";
import { getEmployeeCreateData } from "@/lib/employee-profile-api";

export default async function PersonnelProfileCreatePage() {
  const data = await getEmployeeCreateData();

  return (
    <UserFrame activeModule="hcns-employees" showSearch title="Tạo mới hồ sơ nhân sự">
      <PersonnelProfileCreateBoard data={data} />
    </UserFrame>
  );
}
